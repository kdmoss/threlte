import { SvelteComponentTyped } from "svelte";
import type { EnvironmentProperties } from '../../types/components';
import type { Texture } from 'three';
declare const __propDef: {
    props: {
        groundProjection: EnvironmentProperties['groundProjection'];
        currentEnvMap: Texture;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export declare type GroundProjectedSkyboxProps = typeof __propDef.props;
export declare type GroundProjectedSkyboxEvents = typeof __propDef.events;
export declare type GroundProjectedSkyboxSlots = typeof __propDef.slots;
export default class GroundProjectedSkybox extends SvelteComponentTyped<GroundProjectedSkyboxProps, GroundProjectedSkyboxEvents, GroundProjectedSkyboxSlots> {
}
export {};
