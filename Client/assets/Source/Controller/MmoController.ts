

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
        cc.systemEvent.on(cc.SystemEvent.KeyboardEvent.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.KeyboardEvent.KEY_UP, this._onKeyUp, this);
    }

    public onDestroy () {
        cc.systemEvent.off(cc.SystemEvent.KeyboardEvent.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.KeyboardEvent.KEY_UP, this._onKeyUp, this);
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

        const {
            [cc.SystemEvent.KeyCode.KEY_W]: keyW,
            [cc.SystemEvent.KeyCode.KEY_S]: keyS,
            [cc.SystemEvent.KeyCode.KEY_Q]: keyQ,
            [cc.SystemEvent.KeyCode.KEY_E]: keyE,
            [cc.SystemEvent.KeyCode.KEY_A]: keyA,
            [cc.SystemEvent.KeyCode.KEY_D]: keyD,
        } = this._keyPressed;

        let rotationQuantity= 0.0;
        if (keyA.pressingMode === KeyPressingMode.PRESSING) {
            rotationQuantity += 1.0;
        }
        if (keyD.pressingMode === KeyPressingMode.PRESSING) {
            rotationQuantity += -1.0;
        }

        if (rotationQuantity) {
            const rotationDelta = this.rotationSpeed * deltaTime * rotationQuantity;
            const up = cc.math.Vec3.UNIT_Y;
            const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), up, cc.math.toRadian(rotationDelta));
            const rotation = cc.math.Quat.multiply(q, q, this.node.rotation);
            this.node.rotation = rotation;
        }

        const pressingFactor = 1.0;
        const doublePressingFactor = 6.0;

        const velocity = new cc.math.Vec3();
        if (keyW.pressingMode === KeyPressingMode.PRESSING ||
            keyW.pressingMode === KeyPressingMode.DOUBLE_PRESSING) {
            cc.math.Vec3.scaleAndAdd(
                velocity, velocity,
                cc.math.Vec3.UNIT_Z,
                keyW.pressingMode === KeyPressingMode.PRESSING ? pressingFactor : doublePressingFactor,
            );
        }
        if (keyS.pressingMode === KeyPressingMode.PRESSING ||
            keyS.pressingMode === KeyPressingMode.DOUBLE_PRESSING) {
            cc.math.Vec3.scaleAndAdd(
                velocity, velocity,
                NEG_UNIT_Z,
                keyS.pressingMode === KeyPressingMode.PRESSING ? pressingFactor : doublePressingFactor,
            );
        }
        if (keyQ.pressingMode === KeyPressingMode.PRESSING ||
            keyQ.pressingMode === KeyPressingMode.DOUBLE_PRESSING) {
            cc.math.Vec3.scaleAndAdd(
                velocity, velocity,
                cc.math.Vec3.UNIT_Z,
                keyQ.pressingMode === KeyPressingMode.PRESSING ? pressingFactor : doublePressingFactor,
            );
        }
        if (keyE.pressingMode === KeyPressingMode.PRESSING ||
            keyE.pressingMode === KeyPressingMode.DOUBLE_PRESSING) {
            cc.math.Vec3.scaleAndAdd(
                velocity, velocity,
                NEG_UNIT_Z,
                keyE.pressingMode === KeyPressingMode.PRESSING ? pressingFactor : doublePressingFactor,
            );
        }
        cc.math.Vec3.multiplyScalar(velocity, velocity, this.moveSpeed);
        cc.math.Vec3.transformQuat(velocity, velocity, this.node.rotation);
        this.characterStatus.velocity = velocity;
    }

    private _keyPressed = {
        [cc.SystemEvent.KeyCode.KEY_W]: new KeyStatus(),
        [cc.SystemEvent.KeyCode.KEY_A]: new KeyStatus(),
        [cc.SystemEvent.KeyCode.KEY_S]: new KeyStatus(),
        [cc.SystemEvent.KeyCode.KEY_D]: new KeyStatus(),
        [cc.SystemEvent.KeyCode.KEY_Q]: new KeyStatus(),
        [cc.SystemEvent.KeyCode.KEY_E]: new KeyStatus(),
        [cc.SystemEvent.KeyCode.SHIFT_LEFT]: new KeyStatus(),
    };

    private _onKeyDown (event: cc.EventKeyboard) {
        const { keyCode } = event;
        if (keyCode in this._keyPressed) {
            this._keyPressed[keyCode].press();
        }
    }

    private _onKeyUp (event: cc.EventKeyboard) {
        const { keyCode } = event;
        if (keyCode in this._keyPressed) {
            this._keyPressed[keyCode].release();
        }
    }
}

type KeyStatusTable = MmoController['_keyPressed'];

const NEG_UNIT_X = cc.math.Vec3.negate(new cc.math.Vec3(), cc.math.Vec3.UNIT_X);
const NEG_UNIT_Y = cc.math.Vec3.negate(new cc.math.Vec3(), cc.math.Vec3.UNIT_Y);
const NEG_UNIT_Z = cc.math.Vec3.negate(new cc.math.Vec3(), cc.math.Vec3.UNIT_Z);

class KeyStatus {
    get pressingMode () {
        return this._pressingMode;
    }

    public press () {
        switch (this._pressingMode) {
            default:
            case KeyPressingMode.DOUBLE_PRESSING:
            case KeyPressingMode.PRESSING:
                break;
            case KeyPressingMode.RELEASING: {
                const now = performance.now();
                const interval = now - this._pressedTime;
                if (interval > 100) {
                    this._pressingMode = KeyPressingMode.PRESSING;
                } else {
                    this._pressingMode = KeyPressingMode.DOUBLE_PRESSING;
                }
                this._pressedTime = now;
                break;
            }
        }
    }

    public release () {
        this._pressingMode = KeyPressingMode.RELEASING;
        this._pressedTime = performance.now();
    }

    private _pressingMode = KeyPressingMode.RELEASING;
    private _pressedTime = 0.0;
}

enum KeyPressingMode {
    RELEASING,
    PRESSING,
    DOUBLE_PRESSING,
}
