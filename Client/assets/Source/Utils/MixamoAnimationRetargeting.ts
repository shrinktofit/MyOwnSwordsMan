
import * as cc from 'cc';
import { SkeletonRenderer } from './SkeletonRenderer';
import { getLocalBindPoses, getParentJoint } from './SkeletonUtils';
import { SoftSkin } from './SoftSkin';

@cc._decorator.ccclass('MixamoAnimationRetargeting')
export class MixamoAnimationRetargeting extends cc.Component {
    @cc._decorator.property([cc.AnimationClip])
    public clips: cc.AnimationClip[] = [];

    @cc._decorator.property(cc.AnimationClip)
    public defaultClip: cc.AnimationClip | null = null;

    @cc._decorator.property
    public rootName = '';

    @cc._decorator.property(cc.Skeleton)
    public sourceSkeleton!: cc.Skeleton;

    @cc._decorator.property(cc.Skeleton)
    public targetSkeleton!: cc.Skeleton;

    public postfix = '_Armature';

    public start () {
        const animationComponent = this.node.getComponent(cc.AnimationComponent);
        if (!animationComponent) {
            return;
        }

        const root = this.node.getChildByPath(this.rootName);
        if (!root) {
            return;
        }

        const path: string[] = [];
        let node: cc.Node | null = root;
        while (node !== null && node !== this.node) {
            path.unshift(node.name);
            node = node.parent;
        }

        const prefix = path.join('/') + '/';
        const mapping = new SkeletonMapping(prefix, this.postfix);
        
        for (const clip of this.clips) {
            retargetAnimation(clip, mapping);
        }
        animationComponent.clips = animationComponent.clips.concat(this.clips);
        animationComponent.defaultClip = this.defaultClip;

        const newSkeleton = retargetJoints(this.sourceSkeleton, this.targetSkeleton, mapping);
        newSkeleton.name = `Retargeted skeleton`;

        // const copyRenderer = copySkinnedMeshRenderer(skinnedMeshRenderer);
        // copyRenderer.skeleton = newSkeleton;
        // skinnedMeshRenderer.enabled = false;
        for (const skinnedMeshRenderer of this.node.getComponentsInChildren(cc.SkinnedMeshRenderer)) {
            skinnedMeshRenderer.skeleton = newSkeleton;
        }

        const retargetedSkeletonRenderNode = this.node.scene.getChildByName('RetargetedSkeletonDebugging') as unknown as cc.Node;
        const retargetedSkeletonRenderer = retargetedSkeletonRenderNode.getComponentInChildren(SkeletonRenderer)!;
        // retargetedSkeletonRenderer.skeleton = newSkeleton;
        retargetedSkeletonRenderer.setRootNodesFromSkeleton(newSkeleton);
        for (const skinRenderer of retargetedSkeletonRenderNode.getComponentsInChildren(SoftSkin)) {
            skinRenderer.skeleton = newSkeleton;
        }
        retargetedSkeletonRenderNode.getComponentInChildren(cc.Animation)!.defaultClip = this.defaultClip;
    }
}

function retargetJoints (sourceSkeleton: cc.Skeleton, targetSkeleton: cc.Skeleton, mapping: SkeletonMapping) {
    const sourceLocalBindPoses = getLocalBindPoses(sourceSkeleton);
    const sourceInverseBindPoses = sourceSkeleton.bindposes;
    const targetLocalBindPoses = getLocalBindPoses(targetSkeleton);
    const targetInverseBindPoses = targetSkeleton.bindposes;

    const targetToSourceMapping = new Array(targetSkeleton.joints.length).fill(-1);
    sourceSkeleton.joints.forEach((sourceJointPath, sourceJointIndex) => {
        const mappedJointPath = mapping.get(sourceJointPath);
        if (!mappedJointPath) {
            console.warn(`Source joint ${sourceJointPath} is not mapped.`);
            return;
        }
        const targetJointIndex = targetSkeleton.joints.indexOf(mappedJointPath);
        if (!targetJointIndex) {
            console.warn(`Source joint ${sourceJointPath} is not mapped into target skeleton.`);
            return;
        }
        targetToSourceMapping[targetJointIndex] = sourceJointIndex;
    });
    const nonMappedTargetJoints = targetToSourceMapping
        .map((_, index) => index)
        .filter((index) => targetToSourceMapping[index] < 0);
    if (nonMappedTargetJoints.length !== 0) {
        console.warn(
            `The following joints in target skeleton are not mapped:\n` +
            `${nonMappedTargetJoints.map((index) => targetSkeleton.joints[index].split('/').pop()).join('\n')}`);
    }

    const newBindPoseMatrices = Array.from({ length: targetSkeleton.joints.length }, () => new cc.math.Mat4());
    for (let iTargetJoint = 0; iTargetJoint < targetSkeleton.joints.length; ++iTargetJoint) {
        const targetJointIndex = iTargetJoint;
        const sourceJointIndex = targetToSourceMapping[iTargetJoint];

        if (sourceJointIndex < 0) {
            continue;
        }
        
        const newBindPoseLocal = newBindPoseMatrices[targetJointIndex];
        const sourceLocalBindPose = sourceLocalBindPoses[sourceJointIndex];
        const sourceInverseBindPose = sourceInverseBindPoses[sourceJointIndex];
        const sourceLocalInverseBindPose = cc.math.Mat4.invert(new cc.math.Mat4(), sourceInverseBindPose);
        const targetLocalBindPose = targetLocalBindPoses[targetJointIndex];
        const targetLocalInverseBindPose = cc.math.Mat4.invert(new cc.math.Mat4(), targetLocalBindPose);
        const targetInverseBindPose = targetInverseBindPoses[targetJointIndex];
        const sourceLocalRotation = sourceLocalBindPose.getRotation(new cc.math.Quat());
        const sourceLocalScale = sourceLocalBindPose.getScale(new cc.math.Vec3());
        const sourceLocalTranslation = sourceLocalBindPose.getTranslation(new cc.math.Vec3());
        const targetLocalTranslation = targetLocalBindPose.getTranslation(new cc.math.Vec3());

        // Enter source joint space
        cc.math.Mat4.multiply(newBindPoseLocal, newBindPoseLocal, sourceLocalBindPose);

        // Cancel target joint space
        cc.math.Mat4.multiply(newBindPoseLocal, newBindPoseLocal, targetLocalInverseBindPose);

        // Mesh space -> Target joint space
        cc.math.Mat4.multiply(newBindPoseLocal, newBindPoseLocal, targetInverseBindPose);
        
        //const targetJointParentIndex = getParentJoint(targetSkeleton, targetJointIndex);
        // const retargetedTranslation = cc.math.Vec3.clone(targetLocalTranslation);
        // const retargetedRotation = sourceLocalRotation;
        // const retargetedScale = sourceLocalScale;
        // cc.math.Vec3.multiplyScalar(retargetedTranslation, retargetedTranslation, 0.001);
        // cc.math.Vec3.multiply(retargetedTranslation, retargetedTranslation, sourceLocalScale);
        // const retargetedLocalBindPose = cc.math.Mat4.fromRTS(new cc.math.Mat4(), retargetedRotation, retargetedTranslation, retargetedScale);
        // cc.math.Mat4.copy(newBindPoseLocal, retargetedLocalBindPose);
        // cc.math.Mat4.multiply(newBindPoseLocal, newBindPoseLocal, targetInverseBindPose);

        // Verify we get no problem with local-world bind pose transformation
        // cc.math.Mat4.copy(newBindPoseLocal, targetLocalBindPose);
        // cc.math.Mat4.copy(newBindPoseLocal, targetLocalBindPose);
    }

    // localBindPosesToWorld(targetSkeleton, newBindPoseMatrices);

    // for (const bindPose of newBindPoseMatrices) {
    //     cc.math.Mat4.invert(bindPose, bindPose);
    // }

    const newSkeleton = new cc.Skeleton();
    newSkeleton.joints = targetSkeleton.joints.slice();
    newSkeleton.bindposes = newBindPoseMatrices;
    return newSkeleton;
}

function getLocalInverseBindPoses (skeleton: cc.Skeleton) {
    const sourceJointsTransforms = Array.from({ length: skeleton.joints.length }, (_, index) => {
        const parentJointIndex = getParentJoint(skeleton, index);
        const bindPose = skeleton.bindposes[index];
        const localBindPose = new cc.math.Mat4();
        if (parentJointIndex < 0) {
            cc.math.Mat4.copy(localBindPose, bindPose);
        } else {
            cc.math.Mat4.multiply(localBindPose, skeleton.inverseBindposes[parentJointIndex], bindPose);
        }
        return localBindPose;
    });
    return sourceJointsTransforms;
}

function localBindPosesToWorld (skeleton: cc.Skeleton, localBindPoses: cc.math.Mat4[]) {
    const childrenTable = skeleton.joints.map(() => ({
        parent: -1,
        children: [] as number[],
    }));
    for (let iTargetJoint = 0; iTargetJoint < skeleton.joints.length; ++iTargetJoint) {
        const parentJointIndex = getParentJoint(skeleton, iTargetJoint);
        if (parentJointIndex >= 0) {
            childrenTable[iTargetJoint].parent = parentJointIndex;
            childrenTable[parentJointIndex].children.push(iTargetJoint);
        }
    }
    
    childrenTable.forEach(({ children, parent }, index) => {
        if (parent >= 0) {
            return;
        }

        calc(index);
        
        function calc (index: number) {
            const my = localBindPoses[index];
            for (const child of childrenTable[index].children) {
                cc.math.Mat4.multiply(localBindPoses[child], my, localBindPoses[child]);
                calc(child);
            }
        }
    });
}

function retargetAnimation (clip: cc.AnimationClip, mapping: SkeletonMapping) {
    for (const track of clip.tracks) {
        const path = track.path;
        if (path.length === 0) {
            continue;
        }
        const hierarchyPath = path[0];
        if (!(hierarchyPath instanceof cc.animation.HierarchyPath)) {
            continue;
        }

        const mapped = mapping.get(hierarchyPath.path);
        if (mapped) {
            hierarchyPath.path = mapped;
        }
    }
}

class SkeletonMapping {
    constructor (prefix: string, postfix: string) {
        this._prefix = prefix;
        this._postfix = postfix;
    }

    public get (source: string) {
        const { _prefix: prefix, _postfix: postfix } = this;
        const mapped = `${prefix}${source.split('/').map((s) => `${s}${postfix}`).join('/')}`;
        return mapped;
    }

    private _prefix: string;
    private _postfix: string;
}

function copySkinnedMeshRenderer (skinnedMeshRenderer: cc.SkinnedMeshRenderer) {
    const node = skinnedMeshRenderer.node;
    const newRenderer = node.addComponent(cc.SkinnedMeshRenderer);
    newRenderer.mesh = skinnedMeshRenderer.mesh;
    // newRenderer.sharedMaterials = skinnedMeshRenderer.sharedMaterials;
    newRenderer.skinningRoot = skinnedMeshRenderer.skinningRoot;
    newRenderer.skeleton = skinnedMeshRenderer.skeleton;
    return newRenderer;
}
