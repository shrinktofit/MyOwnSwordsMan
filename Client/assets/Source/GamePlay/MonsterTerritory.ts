
import * as cc from 'cc';
import type { GraphicsGizmo } from '../Utils/GraphicsGizmo';

@cc._decorator.ccclass
export class MonsterTerritory extends cc.Component {
    @cc._decorator.property
    public radius = 0.0;

    @cc._decorator.property
    public capacity = 0;

    @cc._decorator.property
    public minScale = 1.0;

    @cc._decorator.property
    public maxScale = 1.0;

    @cc._decorator.property(cc.Prefab)
    public prefab!: cc.Prefab;

    public start () {
        if (!this.prefab) {
            return;
        }
        
        for (let iItem = 0; iItem < this.capacity; ++iItem) {
            const item = cc.instantiate(this.prefab);
            this.node.addChild(item);

            // Random position
            const angle = cc.randomRange(0.0, Math.PI * 2);
            const radius = cc.randomRange(0.0, this.radius);
            const pX = radius * Math.cos(angle);
            const pY = radius * Math.sin(angle);
            const position = cc.Vec3.add(new cc.Vec3(), item.position, new cc.Vec3(pX, 0.0, pY));
            item.setPosition(position);

            // Random rotation
            const faceAngle = cc.randomRange(0.0, Math.PI * 2);
            const rotation = cc.Quat.rotateY(new cc.Quat(), item.rotation, faceAngle);
            item.setRotation(rotation);

            const scaleX = cc.randomRange(this.minScale, this.maxScale);
            const scaleY = cc.randomRange(this.minScale, this.maxScale);
            const scaleZ = cc.randomRange(this.minScale, this.maxScale);
            item.setScale(new cc.Vec3(scaleX, scaleY, scaleZ));
        }
    }

    public onGizmo (context: GraphicsGizmo) {
        context.moveTo(this.node.worldPosition);
        context.circle(this.radius);
    }
}
