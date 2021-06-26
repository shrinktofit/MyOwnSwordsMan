

import * as cc from 'cc';

const VELOCITY_ERROR = 1e-3;

@cc._decorator.ccclass
export class CharacterStatus extends cc.Component {
    get velocity (): Readonly<cc.math.Vec3> {
        return this._velocity;
    }

    set velocity (value) {
        cc.math.Vec3.copy(this._targetVelocity, value);
        cc.math.Vec3.subtract(this._acceleration, this._targetVelocity, this._velocity);
        cc.math.Vec3.multiplyScalar(this._acceleration, this._acceleration, 1.29 * 3.0);
    }

    public lateUpdate (deltaTime: number) {
        const {
            _velocity: velocity,
            _targetVelocity: targetVelocity,
            _acceleration: acceleration,
        } = this;

        slowMoveVec3(velocity, targetVelocity, acceleration, deltaTime, VELOCITY_ERROR);

        if (cc.math.Vec3.equals(velocity, targetVelocity, VELOCITY_ERROR)) {
            cc.math.Vec3.copy(velocity, targetVelocity);
        }
        
        if (!cc.math.Vec3.equals(velocity, cc.math.Vec3.ZERO, VELOCITY_ERROR)) {
            const newPosition = cc.math.Vec3.scaleAndAdd(
                new cc.math.Vec3(), this.node.position, velocity, deltaTime);
            this.node.setPosition(newPosition);
        }
    }

    private _acceleration = new cc.math.Vec3();

    private _velocity = new cc.math.Vec3();

    private _targetVelocity = new cc.math.Vec3();
}

function slowMoveVec3 (
    source: cc.math.Vec3,
    target: Readonly<cc.math.Vec3>,
    speed: Readonly<cc.math.Vec3>,
    time: number,
    error: number,
) {
    source.x = slowTo(target.x, source.x, speed.x, time, error);
    source.y = slowTo(target.y, source.y, speed.y, time, error);
    source.z = slowTo(target.z, source.z, speed.z, time, error);
}

function slowTo (target: number, source: number, speed: number, time: number, error: number) {
    if (cc.math.approx(target, source, error)) {
        return source;
    } else {
        const diff = target - source;
        const delta = cc.math.clamp(Math.abs(speed) * time, 0.0, Math.abs(diff)) * Math.sign(diff);
        return source + delta;
    }
}
