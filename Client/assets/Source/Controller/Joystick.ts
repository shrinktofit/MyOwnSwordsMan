

import * as cc from 'cc';

@cc._decorator.ccclass
export class Joystick extends cc.Component {
    public backgroundRadius = 40;

    get pressing () {
        return this._pressing;
    }

    get direction (): Readonly<cc.math.Vec2> {
        return this._direction;
    }

    public start () {
        const uiTransform = this.getComponent(cc.UITransform);
        if (!uiTransform) {
            cc.error(`Missing component UITransform`);
            return;
        }
        this._uiTransform = uiTransform;

        const bar = this.node.getChildByName('Bar');
        if (!bar) {
            cc.error(`Missing node Bar`);
            return;
        }
        this._bar = bar;

        const background = this.node.getChildByName('Background');
        if (!background) {
            cc.error(`Missing node Background`);
            return;
        }
        this._background = background;

        this._originalPositionBar = this._bar.getPosition(new cc.math.Vec3());
        this._originalPositionBackground = this._background.getPosition(new cc.math.Vec3());

        this.node.on(cc.Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
    }

    public onDestroy () {
        this.node.off(cc.Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
    }

    public update (deltaTime: number) {
    }

    private declare _uiTransform: cc.UITransform;
    private declare _bar: cc.Node;
    private declare _background: cc.Node;
    private declare _originalPositionBar: cc.Vec3;
    private declare _originalPositionBackground: cc.Vec3;
    private _pressing = false;
    private _direction: cc.math.Vec2 = new cc.math.Vec2();

    private _onThisNodeTouchStart (touchEvent: cc.EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }
        const localPosition = this._uiTransform.convertToNodeSpaceAR(
            new cc.math.Vec3(touch.getUILocationX(), touch.getUILocationY(), 0.0),
            new cc.math.Vec3(),
        );
        this._bar.setPosition(localPosition);
        this._background.setPosition(localPosition);
        this._pressing = true;
    }

    private _onThisNodeTouchEnd () {
        this._bar.setPosition(this._originalPositionBar);
        this._background.setPosition(this._originalPositionBackground);
        this._pressing = false;
    }
    
    private _onThisNodeTouchCancelled () {
        this._onThisNodeTouchEnd();
    }

    private _onThisNodeTouchMove (touchEvent: cc.EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }

        const backgroundPosition = this._background.getPosition();

        const delta2D = touch.getDelta();
        const delta = new cc.math.Vec3(delta2D.x, delta2D.y);

        const barPosition = this._bar.getPosition(new cc.math.Vec3());
        cc.math.Vec3.add(barPosition, barPosition, delta);
        const { x, y } = clampCircular(barPosition.x, barPosition.y, backgroundPosition.x, backgroundPosition.y, this.backgroundRadius);
        cc.math.Vec3.set(barPosition, x, y, barPosition.z);
        this._bar.setPosition(barPosition);

        const dir3D = cc.math.Vec3.subtract(new cc.math.Vec3(), barPosition, backgroundPosition);
        cc.math.Vec3.normalize(dir3D, dir3D);
        cc.math.Vec2.set(this._direction, dir3D.x, dir3D.y);

        console.log(`Move ${delta}`);
    }
}

function clampCircular (x: number, y: number, centerX: number, centerY: number, radius: number) {
    const center = new cc.math.Vec2(centerX, centerY);
    const dir = new cc.math.Vec2(x, y);
    cc.math.Vec2.subtract(dir, dir, center);
    const distance = cc.math.Vec2.len(dir);
    const clampedDistance = cc.math.clamp(distance, 0, radius);
    cc.math.Vec2.normalize(dir, dir);
    cc.math.Vec2.scaleAndAdd(dir, center, dir, clampedDistance);
    return { x: dir.x, y: dir.y };
}