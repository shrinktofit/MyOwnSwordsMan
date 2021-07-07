
import * as cc from 'cc';
import { CharacterStatus, CharacterStatusEventType } from './CharacterStatus';

const GRAPH_VAR_NAME_SPEED = 'speed';

const GRAPH_VAR_IDLE_RANDOM = 'idleRandom';

const GRAPH_VAR_JUMP = 'jump';

@cc._decorator.ccclass
export class SetupHeroNewGenAnim extends cc.Component {
    @cc._decorator.property([cc.AnimationClip])
    public clips: cc.AnimationClip[] = [];

    @cc._decorator.property(CharacterStatus)
    public characterStatus!: CharacterStatus;

    public start () {
        const poseGraph = this._createPoseGraph();
        const newGenAnim = this.node.addComponent(cc.animation.NewGenAnim);
        newGenAnim.graph = poseGraph;
        this._newGenAnim = newGenAnim;
    }

    public update () {
        const { characterStatus } = this;
        const { velocity } = characterStatus;
        const speed = cc.math.Vec3.len(velocity);
        this._newGenAnim.setValue(GRAPH_VAR_NAME_SPEED, speed);
        this.characterStatus.eventTarget.on(
            CharacterStatusEventType.JUMP_STARTED,
            this._onJumpStarted,
            this,
        );
    }

    public onDestroy () {
        super.onDestroy?.();
        this.characterStatus.eventTarget.off(
            CharacterStatusEventType.JUMP_STARTED,
            this._onJumpStarted,
            this,
        );
    }

    private declare _newGenAnim: cc.animation.NewGenAnim;

    private _createPoseGraph () {
        const poseGraph = new cc.animation.PoseGraph();

        poseGraph.addVariable(GRAPH_VAR_NAME_SPEED, cc.animation.VariableType.NUMBER, 0.0);
        poseGraph.addVariable(GRAPH_VAR_IDLE_RANDOM, cc.animation.VariableType.NUMBER, 0.0);
        poseGraph.addVariable(GRAPH_VAR_JUMP, cc.animation.VariableType.BOOLEAN, false);

        const mainLayer = poseGraph.addLayer();
        this._setupMainLayer(mainLayer);

        return poseGraph;
    }

    private _setupMainLayer (layer: cc.animation.Layer) {
        const mainLayerEntryGraph = layer.graph;
        layer.graph.name = `MainLayerGraph`;
        this._setupMainGraph(mainLayerEntryGraph);
    }

    private _setupMainGraph (graph: cc.animation.PoseSubgraph) {
        const idleGraph = graph.addSubgraph();
        idleGraph.name = `IdleSubgraph`;
        this._setupIdleGraph(idleGraph);

        const movementGraph = graph.addSubgraph();
        movementGraph.name = `MovementSubgraph`;
        this._setupMovementGraph(movementGraph);

        const idleToMovement = graph.connect(idleGraph, movementGraph);
        const idleToMovementCondition = idleToMovement.condition = new cc.animation.Condition();
        idleToMovementCondition.bindProperty('lhs', GRAPH_VAR_NAME_SPEED);
        idleToMovementCondition.operator = cc.animation.Condition.Operator.GREATER_THAN;
        idleToMovementCondition.rhs = 0.0;

        const movementToIdle = graph.connect(movementGraph, idleGraph);
        const movementToIdleCondition = movementToIdle.condition = new cc.animation.Condition();
        movementToIdleCondition.bindProperty('lhs', GRAPH_VAR_NAME_SPEED);
        movementToIdleCondition.operator = cc.animation.Condition.Operator.EQUAL_TO;
        movementToIdleCondition.rhs = 0.0;

        const idleSelfTransition = graph.connect(idleGraph, idleGraph);
        idleSelfTransition.duration = 0.0;

        graph.connect(graph.entryNode, idleGraph);

        const jumpPoseNode = createPoseNodeFromClip(graph, this._getClip('Jumping Up'));
        const onJumpExit = jumpPoseNode.onExit = new cc.EventHandler();
        onJumpExit.target = this.node;
        onJumpExit.component = cc.js.getClassName(SetupHeroNewGenAnim);
        onJumpExit.handler = '_onJumpPoseExit';

        const anyToJump = graph.connect(graph.anyNode, jumpPoseNode);
        const anyToJumpCondition = anyToJump.condition = new cc.animation.Condition();
        anyToJumpCondition.operator = cc.animation.Condition.Operator.BE_TRUE;
        anyToJumpCondition.bindProperty('lhs', GRAPH_VAR_JUMP);

        const jumpToIdle = graph.connect(jumpPoseNode, idleGraph);
        jumpToIdle.exitCondition = 1.0;
    }

    private _setupMovementGraph (graph: cc.animation.PoseSubgraph) {
        const movementBlending = new cc.animation.PoseBlend1D();
        // Bind speed variable to param
        movementBlending.bindProperty('param', GRAPH_VAR_NAME_SPEED);
        // Default speed
        movementBlending.param = 0.0;
        // Children
        movementBlending.children = [
            [createPoseFromClip(this._getClip('Idle')), 0.0],
            [createPoseFromClip(this._getClip('Walking')), 1.0],
            [createPoseFromClip(this._getClip('Running')), 6.0],
        ];
        const movementPoseNode = graph.add();
        movementPoseNode.name = `MovementPoseNode`;
        movementPoseNode.pose = movementBlending;

        graph.connect(graph.entryNode, movementPoseNode);

        const movementExit = graph.connect(movementPoseNode, graph.exitNode);
        const movementToExitCondition = movementExit.condition = new cc.animation.Condition();
        movementToExitCondition.bindProperty('lhs', GRAPH_VAR_NAME_SPEED);
        movementToExitCondition.operator = cc.animation.Condition.Operator.EQUAL_TO;
        movementToExitCondition.rhs = 0.0;
    }

    private _setupIdleGraph (graph: cc.animation.PoseSubgraph) {
        // https://blog.unity.com/technology/shiny-new-animation-features-in-unity-5-0
        const { entryNode, exitNode } = graph;

        const idles: [cc.animation.PoseNode, number][] = [
            [createPoseNodeFromClip(graph, this._getClip('Idle')), 0.3],
            [createPoseNodeFromClip(graph, this._getClip('Bored')), 0.5],
            [createPoseNodeFromClip(graph, this._getClip('Standing W_Briefcase Idle')), 0.7],
            [createPoseNodeFromClip(graph, this._getClip('Soccer Idle')), 1.0],
        ];

        for (const [node, randomThreshold] of idles) {
            const enterTransition = graph.connect(entryNode, node);
            const enterCondition = enterTransition.condition = new cc.animation.Condition();
            enterCondition.bindProperty('lhs', GRAPH_VAR_IDLE_RANDOM);
            enterCondition.operator = cc.animation.Condition.Operator.LESS_THAN;
            enterCondition.rhs = randomThreshold;

            const exitTransition = graph.connect(node, exitNode);
            exitTransition.exitCondition = 1.0;
            exitTransition.duration = 0.0;
        }
    }

    private _getClip (name: string) {
        const clip = this.clips.find((clip) => clip.name === name);
        if (!clip) {
            throw new Error(`Missing clip ${name}`);
        }
        return clip;
    }

    private _onJumpStarted () {
        this._newGenAnim.setValue(GRAPH_VAR_JUMP, true);
    }

    private _onJumpPoseExit () {
        this.characterStatus.jumping = false;
        this._newGenAnim.setValue(GRAPH_VAR_JUMP, false);
    }
}

function createPoseNodeFromClip (graph: cc.animation.PoseSubgraph, clip: cc.AnimationClip) {
    const node = graph.add();
    node.name = clip.name;
    node.pose = createPoseFromClip(clip);
    return node;
}

function createPoseFromClip (clip: cc.AnimationClip) {
    const pose = new cc.animation.AnimatedPose();
    pose.clip = clip;
    return pose;
}
