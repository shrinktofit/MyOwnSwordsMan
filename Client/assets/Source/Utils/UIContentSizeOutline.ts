
import * as cc from 'cc';

@cc._decorator.ccclass
export class UIContentSizeOutline extends cc.Component {
    public start () {
        // this._graphics = this.node.addComponent(cc.Graphics);
    }

    public update () {
        // this._graphics.clear();

        // const uiTransform = this.node.getComponent(cc.UITransform);
        // if (!uiTransform) {
        //     return;
        // }

        // const { _graphics: graphics } = this;
        // const { contentSize } = uiTransform;

        // graphics.moveTo(0.0, 0.0);
        // graphics.lineTo(0.0, contentSize.y);
        // graphics.lineTo(contentSize.x, contentSize.y);
        // graphics.lineTo(contentSize.y, contentSize.x);
        // graphics.close();

        // graphics.stroke();
        // graphics.fill();
    }

    private declare _graphics: cc.Graphics;
}
