
import * as cc from 'cc';
import { CharacterStatus } from './CharacterStatus';

const GRAPH_VAR_NAME_SPEED = 'speed';

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
    }

    private declare _newGenAnim: cc.animation.NewGenAnim;

    private _createPoseGraph () {
        const poseGraph = new cc.animation.PoseGraph();

        poseGraph.addVariable(GRAPH_VAR_NAME_SPEED, 0.0);

        const mainLayer = poseGraph.addLayer();
        this._setupMainLayer(mainLayer);

        return poseGraph;
    }

    private _setupMainLayer (layer: cc.animation.Layer) {
        const mainLayerEntryGraph = layer.graph;
        this._setupMovementGraph(mainLayerEntryGraph);
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
        movementPoseNode.pose = movementBlending;

        graph.connect(graph.entryNode, movementPoseNode);
    }

    private _setupIdleGraph (graph: cc.animation.PoseSubgraph) {
        // https://blog.unity.com/technology/shiny-new-animation-features-in-unity-5-0
        const { entryNode, existNode } = graph;

        const idles = [
            createPoseNodeFromClip(graph, this._getClip('Idle')),
            createPoseNodeFromClip(graph, this._getClip('Bored')),
            createPoseNodeFromClip(graph, this._getClip('Standing W_Briefcase Idle')),
            createPoseNodeFromClip(graph, this._getClip('Soccer Idle')),
        ];

        for (const node of idles) {
            const enterTransition = graph.connect(entryNode, node);
            graph.connect(node, existNode);
        }
    }

    private _getClip (name: string) {
        const clip = this.clips.find((clip) => clip.name === name);
        if (!clip) {
            throw new Error(`Missing clip ${name}`);
        }
        return clip;
    }
}

function createPoseNodeFromClip (graph: cc.animation.PoseSubgraph, clip: cc.AnimationClip) {
    const node = graph.add();
    node.pose = createPoseFromClip(clip);
    return node;
}

function createPoseFromClip (clip: cc.AnimationClip) {
    const pose = new cc.animation.AnimatedPose();
    pose.clip = clip;
    return pose;
}
