

import * as cc from 'cc';
import { CharacterStatus } from '../GamePlay/CharacterStatus';
import { getForward } from '../Utils/NodeUtils';
import { Joystick } from './Joystick';

@cc._decorator.ccclass
export class MmoController extends cc.Component {
    @cc._decorator.property
    public moveSpeed = 1.0;

    @cc._decorator.property
    public rotationSpeed = 180.0;

    @cc._decorator.property(CharacterStatus)
    public characterStatus!: CharacterStatus;

    @cc._decorator.property(Joystick)
    public joystick: Joystick | null = null;

    public start () {
        cc.systemEvent.on(cc.SystemEventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEventType.KEY_UP, this._onKeyUp, this);
    }

    public onDestroy () {
        cc.systemEvent.off(cc.SystemEventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEventType.TOUCH_MOVE, this._onKeyUp, this);
    }

    public update (deltaTime: number) {
        const joyStick = this.joystick;
        if (joyStick && joyStick.pressing) {
            const forward = getForward(this.node);
            const currentDir = new cc.math.Vec3(forward.x, 0.0, forward.z);
            const joyStickDir = new cc.math.Vec3(-joyStick.direction.x, 0.0, joyStick.direction.y);
            if (!cc.math.Vec3.equals(joyStickDir, cc.math.Vec3.ZERO)) {
                const angle = cc.math.Vec3.angle(joyStickDir, currentDir);
                const clampedAngle = cc.math.clamp(angle, 0, cc.math.toRadian(this.rotationSpeed * deltaTime));
                const axis = cc.math.Vec3.cross(
                    new cc.math.Vec3(),
                    cc.math.Vec3.normalize(new cc.math.Vec3(), currentDir),
                    joyStickDir,
                );
                cc.math.Vec3.normalize(axis, axis);
                const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), axis, clampedAngle);
                const rotation = cc.math.Quat.multiply(q, q, this.node.rotation);
                this.node.rotation = rotation;
                
                {
                    const position = this.node.position;
                    const forward = getForward(this.node);
                    const newPosition = cc.math.Vec3.scaleAndAdd(new cc.math.Vec3(), position, forward, deltaTime * this.moveSpeed);
                    this.node.setPosition(newPosition);
                }   
            }
        }

        const rotationQuantity = (this._keyPressed.a ? 1 : 0) + (this._keyPressed.d ? -1 : 0);
        if (rotationQuantity) {
            const rotationDelta = this.rotationSpeed * deltaTime * rotationQuantity;
            const up = cc.math.Vec3.UNIT_Y;
            const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), up, cc.math.toRadian(rotationDelta));
            const rotation = cc.math.Quat.multiply(q, q, this.node.rotation);
            this.node.rotation = rotation;
        }

        const velocity = new cc.math.Vec3();
        if (this._keyPressed.w) {
            cc.math.Vec3.add(velocity, velocity, cc.math.Vec3.UNIT_Z);
        }
        if (this._keyPressed.s) {
            cc.math.Vec3.add(velocity, velocity, NEG_UNIT_Z);
        }
        if (this._keyPressed.q) {
            cc.math.Vec3.add(velocity, velocity, cc.math.Vec3.UNIT_X);
        }
        if (this._keyPressed.e) {
            cc.math.Vec3.add(velocity, velocity, NEG_UNIT_X);
        }
        cc.math.Vec3.multiplyScalar(velocity, velocity, this.moveSpeed);
        cc.math.Vec3.transformQuat(velocity, velocity, this.node.rotation);
        this.characterStatus.velocity = velocity;
    }

    private _keyPressed = {
        w: false,
        a: false,
        s: false,
        d: false,
        q: false,
        e: false,
    };

    private _onKeyDown (event: cc.EventKeyboard) {
        const keyName = keyCodeToKeyName(event.keyCode);
        if (!keyName) {
            return;
        }
        if (keyName in this._keyPressed) {
            this._keyPressed[keyName] = true;
        }
    }

    private _onKeyUp (event: cc.EventKeyboard) {
        const keyName = keyCodeToKeyName(event.keyCode);
        if (!keyName) {
            return;
        }
        if (keyName in this._keyPressed) {
            this._keyPressed[keyName] = false;
        }
    }
}

type KeyStatusTable = MmoController['_keyPressed'];

const NEG_UNIT_X = cc.math.Vec3.negate(new cc.math.Vec3(), cc.math.Vec3.UNIT_X);
const NEG_UNIT_Y = cc.math.Vec3.negate(new cc.math.Vec3(), cc.math.Vec3.UNIT_Y);
const NEG_UNIT_Z = cc.math.Vec3.negate(new cc.math.Vec3(), cc.math.Vec3.UNIT_Z);

function keyCodeToKeyName(keyCode: number): keyof KeyStatusTable | '' {
    const MAP = {
        [cc.macro.KEY.w]: 'w',
        [cc.macro.KEY.a]: 'a',
        [cc.macro.KEY.s]: 's',
        [cc.macro.KEY.d]: 'd',
        [cc.macro.KEY.q]: 'q',
        [cc.macro.KEY.e]: 'e',
    } as const;
    return keyCode in MAP ? MAP[keyCode] : '';
}