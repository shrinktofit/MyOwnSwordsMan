
import * as cc from 'cc';
import type { GraphicsGizmo } from '../Utils/GraphicsGizmo';

@cc._decorator.ccclass
export class MonsterTerritory extends cc.Component {
    @cc._decorator.property
    public radius = 0.0;

    @cc._decorator.property
    public capacity = 0;

    public onGizmo (context: GraphicsGizmo) {
        context.moveTo(this.node.worldPosition);
        context.circle(this.radius);
    }
}
