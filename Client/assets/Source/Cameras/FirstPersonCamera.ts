// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import * as cc from 'cc';
import { reflect } from '../Utils/Math';
import { getForward } from '../Utils/NodeUtils';

@cc._decorator.ccclass('FirstPersonCamera')
export class FirstPersonCamera extends cc.Component {
    @cc._decorator.property
    public initialDistance = 1.0;

    @cc._decorator.property
    public initialHorizonRotation = 0.0;

    @cc._decorator.property
    public initialVerticalRotation = 45.0;

    @cc._decorator.property
    public horizonRotationSpeed = 1.0;

    @cc._decorator.property
    public verticalRotationSpeed = 1.0;

    @cc._decorator.property
    public mouseWheelSpeed = 0.01;

    @cc._decorator.property
    public touchZoomSpeed = 0.01;

    @cc._decorator.property
    public autoTraceSpeed = 180.0;

    @cc._decorator.property(cc.Node)
    public target!: cc.Node;

    public start () {
        this._zoom(this.initialDistance);
        this._rotateHorizon(this.initialHorizonRotation);
        this._rotateVertical(this.initialVerticalRotation);
        this._updatePosition();
        cc.systemEvent.on(cc.SystemEventType.MOUSE_DOWN, this._onMouseDown, this);
        cc.systemEvent.on(cc.SystemEventType.MOUSE_MOVE, this._onMouseMove, this);
        cc.systemEvent.on(cc.SystemEventType.MOUSE_UP, this._onMouseUp, this);
        cc.systemEvent.on(cc.SystemEventType.MOUSE_WHEEL, this._onMouseWheel, this);
        cc.systemEvent.on(cc.SystemEventType.TOUCH_START, this._onTouchBegin, this);
        cc.systemEvent.on(cc.SystemEventType.TOUCH_MOVE, this._onTouchMove, this);
        cc.systemEvent.on(cc.SystemEventType.TOUCH_END, this._onTouchEnd, this);
    }

    public onDestroy () {
        cc.systemEvent.off(cc.SystemEventType.MOUSE_DOWN, this._onMouseDown, this);
        cc.systemEvent.off(cc.SystemEventType.MOUSE_MOVE, this._onMouseMove, this);
        cc.systemEvent.off(cc.SystemEventType.MOUSE_UP, this._onMouseUp, this);
        cc.systemEvent.off(cc.SystemEventType.MOUSE_WHEEL, this._onMouseWheel, this);
    }

    public update (deltaTime: number) {
        const targetWorldPosition = this.target.worldPosition;
        const targetLastPosition = this._targetLastPosition;
        let targetPositionChanged = !cc.math.Vec3.strictEquals(targetLastPosition, targetWorldPosition);
        if (targetPositionChanged) {
            cc.math.Vec3.copy(targetLastPosition, targetWorldPosition);
            this._autoTrace(deltaTime);
        }

        if (this._currentDirDirty) {
            this._currentDirDirty = false;
            this._updatePosition();
        }
    }

    private _targetLastPosition = new cc.math.Vec3();
    private _currentDirDirty = true;
    private _currentDir = cc.math.Vec3.negate(new cc.math.Vec3(), cc.math.Vec3.UNIT_Z);
    private _mouseButtonPressing = {
        left: false,
        right: false,
        middle: false,
    };

    private _previousTwoTouchDistance = 0.0;

    private _calcTransform (targetPosition: cc.math.Vec3, outPosition: cc.math.Vec3, outRotation: cc.math.Quat) {
        const dir = cc.math.Vec3.normalize(new cc.math.Vec3(), this._currentDir);
        cc.math.Quat.fromViewUp(outRotation, dir, cc.math.Vec3.UNIT_Y);
        cc.math.Vec3.add(outPosition, targetPosition, this._currentDir);
    }

    private _onMouseDown (event: cc.EventMouse) {
        switch (event.getButton()) {
            default: break;
            case cc.EventMouse.BUTTON_LEFT: this._mouseButtonPressing.left = true; break;
            case cc.EventMouse.BUTTON_RIGHT: this._mouseButtonPressing.right = true; break;
            case cc.EventMouse.BUTTON_MIDDLE: this._mouseButtonPressing.middle = true; break;
        }
    }

    private _onMouseMove (event: cc.EventMouse) {
        if (this._mouseButtonPressing.right) {
            const dx = event.getDeltaX();
            if (dx) {
                const angle = -dx * this.horizonRotationSpeed;
                this._rotateHorizon(angle);
            }
            const dy = event.getDeltaY();
            if (dy) {
                const angle = -dy * this.verticalRotationSpeed;
                this._rotateVertical(angle);
            }
        }
    }

    private _onMouseUp (event: cc.EventMouse) {
        switch (event.getButton()) {
            default: break;
            case cc.EventMouse.BUTTON_LEFT: this._mouseButtonPressing.left = false; break;
            case cc.EventMouse.BUTTON_RIGHT: this._mouseButtonPressing.right = false; break;
            case cc.EventMouse.BUTTON_MIDDLE: this._mouseButtonPressing.middle = false; break;
        }
    }

    private _onMouseWheel (event: cc.EventMouse) {
        const deltaZoom = -this.mouseWheelSpeed * event.getScrollY();
        this._zoomDelta(deltaZoom);
    }

    private _onTouchBegin (touch: cc.Touch, eventTouch: cc.EventTouch) {
        const allTouches = eventTouch.getAllTouches();
        switch (allTouches.length) {
            default: break;
            case 2: {
                const [touch1, touch2] = allTouches;
                this._previousTwoTouchDistance = cc.math.Vec2.distance(
                    touch1.getLocation(),
                    touch2.getLocation(),
                );
                break;
            }
        }
    }

    private _onTouchMove (touch: cc.Touch, eventTouch: cc.EventTouch) {
        const allTouches = eventTouch.getAllTouches();
        switch (allTouches.length) {
            default: break;
            case 1: {
                const delta = touch.getDelta();
                const dx = delta.x;
                if (dx) {
                    const angle = -dx * this.horizonRotationSpeed;
                    this._rotateHorizon(angle);
                }
                const dy = delta.y;
                if (dy) {
                    const angle = -dy * this.verticalRotationSpeed;
                    this._rotateVertical(angle);
                }
                break;
            }
            case 2: {
                const [touch1, touch2] = allTouches;
                const distance = cc.math.Vec2.distance(
                    touch1.getLocation(),
                    touch2.getLocation(),
                );
                const dDistance = distance - this._previousTwoTouchDistance;
                this._previousTwoTouchDistance = distance;
                if (dDistance !== 0) {
                    const deltaZoom = -this.touchZoomSpeed * dDistance;
                    this._zoomDelta(deltaZoom);
                }
                break;
            }
        }
    }

    private _onTouchEnd (touch: cc.Touch) {
        
    }

    private _updatePosition () {
        const position = new cc.math.Vec3();
        const rotation = new cc.math.Quat();
        this._calcTransform(this.target.worldPosition, position, rotation);
        this.node.position = position;
        this.node.rotation = rotation;
    }

    private _autoTrace (deltaTime: number) {
        const targetBackward = cc.math.Vec3.negate(new cc.math.Vec3(), getForward(this.target));
        const currentDirNormalized = cc.math.Vec3.normalize(new cc.math.Vec3(), this._currentDir);
        const up = cc.math.Vec3.UNIT_Y;

        const currentDirXZ = cc.math.Vec3.projectOnPlane(new cc.math.Vec3(), currentDirNormalized, up);
        cc.math.Vec3.normalize(currentDirXZ, currentDirXZ);
        const currentAngle = cc.math.Vec3.angle(currentDirXZ, targetBackward);
        if (currentAngle !== Math.PI) {
            const currentAngleDegrees = cc.math.toDegree(currentAngle);
            const clampedAngle = cc.math.clamp(deltaTime * this.autoTraceSpeed, 0.0, 180.0 - currentAngleDegrees);
            const axis = cc.math.Vec3.cross(new cc.math.Vec3(), currentDirXZ, targetBackward);
            const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), axis, cc.math.toRadian(clampedAngle));
            cc.math.Vec3.transformQuat(this._currentDir, this._currentDir, q);
            this._currentDirDirty = true;
        }
    }

    private _zoom (distance: number) {
        cc.math.Vec3.normalize(this._currentDir, this._currentDir);
        cc.math.Vec3.multiplyScalar(this._currentDir, this._currentDir, distance);
        this._currentDirDirty = true;
    }

    private _zoomDelta (delta: number) {
        const currentLen = cc.math.Vec3.len(this._currentDir);
        const len = currentLen + delta;
        this._zoom(len);
    }

    private _rotateHorizon (angle: number) {
        const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), cc.math.Vec3.UNIT_Y, cc.math.toRadian(angle));
        cc.math.Vec3.transformQuat(this._currentDir, this._currentDir, q);
        this._currentDirDirty = true;
    }

    private _rotateVertical (angle: number) {
        const currentDirNorm = cc.math.Vec3.normalize(new cc.math.Vec3(), this._currentDir);
        const up = cc.math.Vec3.UNIT_Y;

        const axis = cc.math.Vec3.cross(new cc.math.Vec3(), currentDirNorm, up);
        cc.math.Vec3.normalize(axis, axis);

        const currentAngle = cc.math.toDegree(cc.math.Vec3.angle(currentDirNorm, up));
        const DISABLE_FLIP_DELTA = 1e-2;
        const clampedAngle = currentAngle - cc.math.clamp(currentAngle - angle, 0.0 + DISABLE_FLIP_DELTA, 180.0 - DISABLE_FLIP_DELTA);
        const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), axis, cc.math.toRadian(clampedAngle));
        cc.math.Vec3.transformQuat(this._currentDir, this._currentDir, q);
        this._currentDirDirty = true;
    }
}
