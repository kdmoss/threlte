<script>import { CameraInstance, Group, Mesh, useFrame, useThrelte } from '@threlte/core';
import { onDestroy } from 'svelte';
import { Color, Mesh as ThreeMesh, MeshBasicMaterial, MeshDepthMaterial, OrthographicCamera, PlaneBufferGeometry, ShaderMaterial, WebGLRenderTarget } from 'three';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader';
import { useMemo } from '../../lib/useMemo';
// Group Properties
export let position = undefined;
export let rotation = undefined;
export let lookAt = undefined;
export let viewportAware = false;
export let inViewport = false;
export let castShadow = undefined;
export let receiveShadow = undefined;
export let frustumCulled = undefined;
export let renderOrder = undefined;
export let visible = undefined;
// self
export let opacity = 1;
export let width = 1;
export let height = 1;
export let blur = 1;
export let far = 10;
export let smooth = true;
export let resolution = 512;
export let frames = Infinity;
export let scale = 10;
export let color = '#000000';
export let depthWrite = false;
const { scene, renderer } = useThrelte();
if (!renderer)
    throw new Error('ContactShadow: WebGLRenderer is undefined, is this component a child of <Canvas>?');
const scaledWidth = useMemo(() => {
    return width * (Array.isArray(scale) ? scale[0] : scale || 1);
});
$: scaledWidth.memoize([width, scale]);
const scaledHeight = useMemo(() => {
    return height * (Array.isArray(scale) ? scale[1] : scale || 1);
});
$: scaledHeight.memoize(height, scale);
const renderTarget = useMemo(() => {
    const rt = new WebGLRenderTarget(resolution, resolution);
    rt.texture.generateMipmaps = false;
    rt.texture.encoding = renderer.outputEncoding;
    return rt;
});
$: renderTarget.memoize(resolution);
const renderTargetBlur = useMemo(() => {
    const rt = new WebGLRenderTarget(resolution, resolution);
    rt.texture.generateMipmaps = false;
    return rt;
});
$: renderTargetBlur.memoize(resolution);
const planeGeometry = useMemo(() => {
    return new PlaneBufferGeometry($scaledWidth, $scaledHeight).rotateX(Math.PI / 2);
});
$: planeGeometry.memoize($scaledWidth, $scaledHeight);
const blurPlane = useMemo(() => {
    return new ThreeMesh($planeGeometry);
});
$: blurPlane.memoize($planeGeometry);
const depthMaterial = useMemo(() => {
    const dm = new MeshDepthMaterial({
        depthTest: false,
        depthWrite: false
    });
    dm.onBeforeCompile = (shader) => {
        shader.uniforms = {
            ...shader.uniforms,
            uColor: {
                value: new Color(color).convertSRGBToLinear()
            }
        };
        shader.fragmentShader = 'uniform vec3 uColor;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( uColor, ( 1.0 - fragCoordZ ) * 1.0 );');
        // minified replace, https://github.com/yushijinhun/three-minifier also minifies GLSL files
        shader.fragmentShader = shader.fragmentShader.replace('vec4(vec3(1.0-fragCoordZ),opacity);', 'vec4(uColor,(1.0-fragCoordZ)*1.0);');
    };
    return dm;
});
$: depthMaterial.memoize(color);
const horizontalBlurMaterial = new ShaderMaterial({
    ...HorizontalBlurShader,
    depthTest: false
});
const verticalBlurMaterial = new ShaderMaterial({
    ...VerticalBlurShader,
    depthTest: false
});
const shadowCamera = new OrthographicCamera(-$scaledWidth / 2, $scaledWidth / 2, $scaledHeight / 2, -$scaledHeight / 2, 0, far);
shadowCamera.updateProjectionMatrix();
const shadowMaterial = new MeshBasicMaterial({
    map: $renderTarget.texture,
    transparent: true,
    opacity,
    depthWrite
});
const blurShadows = (blur) => {
    // separate from store to not call store setter
    const bp = $blurPlane;
    bp.visible = true;
    bp.material = horizontalBlurMaterial;
    horizontalBlurMaterial.uniforms.tDiffuse.value = $renderTarget.texture;
    horizontalBlurMaterial.uniforms.h.value = (blur * 1) / 256;
    renderer.setRenderTarget($renderTargetBlur);
    renderer.render(bp, shadowCamera);
    bp.material = verticalBlurMaterial;
    verticalBlurMaterial.uniforms.tDiffuse.value = $renderTargetBlur.texture;
    verticalBlurMaterial.uniforms.v.value = (blur * 1) / 256;
    renderer.setRenderTarget($renderTarget);
    renderer.render(bp, shadowCamera);
    bp.visible = false;
};
const renderShadows = () => {
    // remove the background
    const initialBackground = scene.background;
    scene.background = null;
    // force the depthMaterial to everything
    const initialOverrideMaterial = scene.overrideMaterial;
    scene.overrideMaterial = $depthMaterial;
    // set renderer clear alpha
    const initialClearAlpha = renderer.getClearAlpha();
    renderer.setClearAlpha(0);
    // render to the render target to get the depths
    renderer.setRenderTarget($renderTarget);
    renderer.render(scene, shadowCamera);
    // and reset the override material
    scene.overrideMaterial = initialOverrideMaterial;
    blurShadows(blur);
    // a second pass to reduce the artifacts
    if (smooth)
        blurShadows(blur * 0.4);
    // reset
    renderer.setRenderTarget(null);
    scene.background = initialBackground;
    renderer.setClearAlpha(initialClearAlpha);
};
export const refresh = () => {
    renderShadows();
};
let count = 0;
useFrame(() => {
    if (frames === Infinity || count < frames) {
        renderShadows();
        count += 1;
    }
});
onDestroy(() => {
    $renderTarget.dispose();
    $renderTargetBlur.dispose();
    $planeGeometry.dispose();
    $depthMaterial.dispose();
    horizontalBlurMaterial.dispose();
    verticalBlurMaterial.dispose();
    shadowMaterial.dispose();
});
let combinedRotation = {
    ...rotation,
    x: rotation?.x ?? 0 + Math.PI / 2
};
$: combinedRotation = {
    ...rotation,
    x: rotation?.x ?? 0 + Math.PI / 2
};
</script>

<Group
  rotation={combinedRotation}
  {position}
  {lookAt}
  {viewportAware}
  {castShadow}
  {receiveShadow}
  {frustumCulled}
  {visible}
  {renderOrder}
  bind:inViewport
  on:viewportenter
  on:viewportleave
>
  <Mesh
    material={shadowMaterial}
    geometry={$planeGeometry}
    {renderOrder}
    scale={{ y: -1 }}
    rotation={{ x: -Math.PI / 2 }}
  />
  <CameraInstance camera={shadowCamera} useCamera={false} />
</Group>
