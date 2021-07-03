
import * as cc from 'cc';
import type { GraphicsGizmo } from '../Utils/GraphicsGizmo';
import { CharacterStatus } from './CharacterStatus';

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

    @cc._decorator.boolean
    public stupid: boolean = false;

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

            if (this.stupid) {
                const stupid = item.addComponent(Stupid);
                stupid.territory = this;
                stupid.characterStatus = item.getComponent(CharacterStatus)!;
            }
        }
    }

    public onGizmo (context: GraphicsGizmo) {
        context.moveTo(this.node.worldPosition);
        context.circle(this.radius);
    }
}

class Stupid extends cc.Component {
    public declare territory: MonsterTerritory;

    public declare characterStatus: CharacterStatus;

    start () {
    }

    update (deltaTime: number) {
        switch (this._state) {
            case StupidState.NONE: this._onStateNone(); break;
            case StupidState.IDLE: this._onStateIdle(deltaTime); break;
            case StupidState.WALKING: this._onStateWalking(deltaTime); break;
        }
    }

    private _state: StupidState = StupidState.NONE;

    private _idleStateTimer = 0.0;

    private _walkTarget = new cc.math.Vec3();

    private _walkSpeed = 0.0;

    private _onStateNone () {
        this._startIdle();
    }

    private _onStateIdle (deltaTime: number) {
        if (this._idleStateTimer > 0.0) {
            this._idleStateTimer -= deltaTime;
        } else {
            this._startWalk();
        }
    }

    private _onStateWalking (deltaTime: number) {
        const distance = cc.math.Vec3.distance(this.node.position, this._walkTarget);
        if (cc.math.approx(distance, 0.0, 1e-2)) {
            this._startIdle();
        } else {
            const inc = Math.min(this._walkSpeed * deltaTime, distance);
            const dir = cc.math.Vec3.subtract(
                new cc.math.Vec3(), this._walkTarget, this.node.position);
            cc.math.Vec3.normalize(dir, dir);
            this.node.position = cc.math.Vec3.scaleAndAdd(new cc.math.Vec3(), this.node.position, dir, inc);
        }
    }

    private _startIdle () {
        this._state = StupidState.IDLE;
        this.characterStatus.velocity = cc.Vec3.ZERO;
        this._idleStateTimer = cc.math.randomRange(5.0, 10.0);
    }

    private _startWalk () {
        this._state = StupidState.WALKING;
        const angle = cc.randomRange(0.0, Math.PI * 2);
        const radius = cc.randomRange(0.0, this.territory.radius);
        const pX = radius * Math.cos(angle);
        const pY = radius * Math.sin(angle);
        this._walkTarget = new cc.Vec3(pX, 0.0, pY);
        this._walkSpeed = cc.randomRange(0.5, 1.0);
        const dir = cc.math.Vec3.subtract(
            new cc.math.Vec3(), this._walkTarget, this.node.position);
        cc.math.Vec3.normalize(dir, dir);
        const rotationAngle = cc.math.Vec3.angle(dir, cc.math.Vec3.UNIT_Z);
        const rotationAxis = cc.math.Vec3.cross(new cc.math.Vec3(), cc.math.Vec3.UNIT_Z, dir);
        const rotation = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), rotationAxis, rotationAngle);
        this.node.rotation = rotation;
        this.characterStatus.velocity = cc.math.Vec3.multiplyScalar(new cc.math.Vec3(), dir, this._walkSpeed);
    }
}

enum StupidState {
    NONE,
    IDLE,
    WALKING,
}