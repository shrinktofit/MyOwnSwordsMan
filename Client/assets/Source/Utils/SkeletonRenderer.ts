import { Component, Material, Mesh, MeshRenderer, Node, Quat, Skeleton, utils, Vec3, _decorator } from "cc";
import { createOctahedralBone } from "./OctahedralBone";
import { skeletonToNodes } from "./SkeletonUtils";

@_decorator.ccclass
export class SkeletonRenderer extends Component {
    @_decorator.property(Material)
    public material: Material | null = null;

    @_decorator.property(Skeleton)
    public skeleton: Skeleton | null = null;

    @_decorator.property(Node)
    public skeletonParent: Node | null = null;

    private _anyJointTransformChanged = true;

    private _boneRenderings: BoneRendering[] = [];

    private _boneMesh: Mesh;

    private _rootNodes: Node[] = [];

    constructor () {
        super();
        const boneGeometry = createOctahedralBone({
            width: 0.1,
            length: 0.1,
        });
        this._boneMesh = utils.createMesh(boneGeometry);
    }

    public setRootNodesFromSkeleton (skeleton: Skeleton) {
        const skeletonParent = this.skeletonParent ?? this.node.scene as unknown as Node;

        const rootJointNodes = skeletonToNodes(skeleton);
        for (const rootJointNode of rootJointNodes) {
            skeletonParent.addChild(rootJointNode);
        }

        this._rootNodes = rootJointNodes;
    }

    public start () {
        if (this.skeleton) {
            this.setRootNodesFromSkeleton(this.skeleton);
        }

        const rootJointNodes = this._rootNodes;

        for (const rootNode of rootJointNodes) {
            this._recursiveAddBoneRenderings(rootNode);
        }

        for (const rootNode of rootJointNodes) {
            this._watchJointTransformChangeEvent(rootNode);
        }
    }

    public update () {
        if (this._anyJointTransformChanged) {
            this._anyJointTransformChanged = false;
            this._updateSkeletonRendering();
        }
    }

    private _watchJointTransformChangeEvent (node: Node) {
        node.on(Node.EventType.TRANSFORM_CHANGED, this._onAnyJointTransformChanged, this);
        for (const child of node.children) {
            this._watchJointTransformChangeEvent(child);
        }
    }

    private _onAnyJointTransformChanged () {
        this._anyJointTransformChanged = true;
    }

    private _updateSkeletonRendering () {
        for (const boneRendering of this._boneRenderings) {
            this._updateBone(boneRendering);
        }
    }

    private _recursiveAddBoneRenderings (parentJoint: Node) {
        for (const child of parentJoint.children) {
            this._addBoneRendering(parentJoint, child);
            this._recursiveAddBoneRenderings(child);
        }
    }

    private _addBoneRendering (parentJoint: Node, childJoint: Node) {
        const renderingNode = new Node();
        renderingNode.name = `${parentJoint.name}-${childJoint.name}`;
        this.node.addChild(renderingNode);

        const boneMeshRenderer = renderingNode.addComponent(MeshRenderer);
        boneMeshRenderer.material = this.material;
        boneMeshRenderer.mesh = this._boneMesh;

        const boneRendering: BoneRendering = {
            parentJoint,
            childJoint,
            renderingNode,
        };

        this._boneRenderings.push(boneRendering);
    }

    private _updateBone (boneRendering: BoneRendering) {
        const { parentJoint, childJoint } = boneRendering;
        const fromPos = parentJoint.getWorldPosition();
        const toPos = childJoint.getWorldPosition();

        const dir = Vec3.subtract(new Vec3(), toPos, fromPos);
        const dirLen = Vec3.len(dir);
        Vec3.normalize(dir, dir);
        const rot = Quat.rotationTo(new Quat(), Vec3.UNIT_Y, dir);

        boneRendering.renderingNode.setRTS(rot, fromPos, new Vec3(dirLen, dirLen, dirLen));
    }
}

interface BoneRendering {
    renderingNode: Node;
    parentJoint: Node;
    childJoint: Node;
}
