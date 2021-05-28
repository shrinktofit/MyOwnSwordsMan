

import * as cc from 'cc';

@cc._decorator.ccclass
export class BillboardUi extends cc.Component {
    @cc._decorator.property(cc.Node)
    public target!: cc.Node;

    @cc._decorator.property(cc.Camera)
    public camera!: cc.Camera;

    @cc._decorator.property
    public distance = 0.0;

    public start () {
        const targetPosition = this.target.worldPosition;
        cc.math.Vec3.copy(this._lastTargetPosition, targetPosition);
        this._updatePosition(targetPosition);
    }

    public update () {
        const {
            target,
            _lastTargetPosition: lastTargetPosition,
        } = this;

        const targetPosition = target.worldPosition;
        if (cc.Vec3.equals(targetPosition, lastTargetPosition)) {
            return;
        }
        cc.math.Vec3.copy(lastTargetPosition, targetPosition);

        this._updatePosition(targetPosition);
    }

    private _lastTargetPosition = new cc.math.Vec3();

    private _updatePosition (targetPosition: Readonly<cc.math.Vec3>) {
        const { camera } = this;

        camera.camera.update();

        const uiPosition = camera.convertToUINode(
            targetPosition, this.node.parent!, new cc.math.Vec3());
        this.node.setPosition(uiPosition);

        // cc.math.Vec3.transformMat4(uiPosition, targetPosition, camera.camera.matView);
        // const ratio = this.distance / Math.abs(uiPosition.z);
        // const value = Math.floor(ratio * 100) / 100;
        // this.node.setScale(value, value, 1.0);
    }
}