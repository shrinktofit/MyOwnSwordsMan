import * as cc from "cc";

export function reflect (out: cc.math.Vec3, input: cc.math.Vec3, normal: cc.math.Vec3) {
    return cc.math.Vec3.scaleAndAdd(out, input, normal, -2.0 * cc.math.Vec3.dot(input, normal));
}
