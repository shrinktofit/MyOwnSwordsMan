import * as cc from 'cc';

export function skeletonToNodes (skeleton: cc.Skeleton) {
    const localBindPoses = getLocalBindPoses(skeleton);

    const nodes = skeleton.joints.map((path, index) => {
        const node = new cc.Node(path.split('/').pop());
        const position = new cc.math.Vec3();
        const scale = new cc.math.Vec3();
        const rotation = new cc.math.Quat();
        cc.math.Mat4.toRTS(localBindPoses[index], rotation, position, scale);
        node.setRTS(rotation, position, scale);
        return node;
    });

    const rootNodes: cc.Node[] = [];
    for (let iTargetJoint = 0; iTargetJoint < skeleton.joints.length; ++iTargetJoint) {
        const parentJointIndex = getParentJoint(skeleton, iTargetJoint);
        if (parentJointIndex >= 0) {
            nodes[parentJointIndex].addChild(nodes[iTargetJoint]);
        } else {
            rootNodes.push(nodes[iTargetJoint]);
        }
    }
    return rootNodes;
}

export function getLocalBindPoses (skeleton: cc.Skeleton) {
    const sourceJointsTransforms = Array.from({ length: skeleton.joints.length }, (_, index) => {
        const parentJointIndex = getParentJoint(skeleton, index);
        const bindPose = skeleton.inverseBindposes[index];
        const localBindPose = new cc.math.Mat4();
        if (parentJointIndex < 0) {
            cc.math.Mat4.copy(localBindPose, bindPose);
        } else {
            cc.math.Mat4.multiply(localBindPose, skeleton.bindposes[parentJointIndex], bindPose);
        }
        return localBindPose;
    });
    return sourceJointsTransforms;
}

export function getParentJoint (skeleton: cc.Skeleton, jointIndex: number) {
    const jointPath = skeleton.joints[jointIndex];
    const segments = jointPath.split('/');
    const parentJointPath = segments.length === 1 ? '' : segments.slice(0, segments.length - 1).join('/');
    const parentJointIndex = !parentJointPath ? -1 : skeleton.joints.indexOf(parentJointPath);
    return parentJointIndex;
}