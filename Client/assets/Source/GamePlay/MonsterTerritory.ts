
import * as cc from 'cc';
import type { GraphicsGizmo } from '../Utils/GraphicsGizmo';

@cc._decorator.ccclass
export class MonsterTerritory extends cc.Component {
    @cc._decorator.property
    public radius = 0.0;

    @cc._decorator.property
    public capacity = 0;

    @cc._decorator.property(cc.Prefab)
    public prefab!: cc.Prefab;

    public start () {
        if (!this.prefab) {
            return;
        }
        
        for (let iItem = 0; iItem < this.capacity; ++iItem) {
            const item = cc.instantiate(this.prefab);
            this.node.addChild(item);

            const angle = cc.randomRange(0.0, Math.PI * 2);
            const radius = cc.randomRange(0.0, this.radius);
            const pX = radius * Math.cos(angle);
            const pY = radius * Math.sin(angle);
            item.setPosition(pX, item.position.y, pY);
        }
    }

    public onGizmo (context: GraphicsGizmo) {
        context.moveTo(this.node.worldPosition);
        context.circle(this.radius);
    }
}
