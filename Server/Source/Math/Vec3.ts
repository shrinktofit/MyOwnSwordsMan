
export class Vec3 {
    public declare x: number;

    public declare y: number;

    public declare z: number;

    constructor (x = 0.0, y = 0.0, z = 0.0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public static add (lhs: Vec3, rhs: Vec3, out?: Vec3) {
        out ??= new Vec3();
        out.x = lhs.x + rhs.x;
        out.y = lhs.y + rhs.y;
        out.z = lhs.z + rhs.z;
        return out;
    }

    public static subtract (lhs: Vec3, rhs: Vec3, out?: Vec3) {
        out ??= new Vec3();
        out.x = lhs.x - rhs.x;
        out.y = lhs.y - rhs.y;
        out.z = lhs.z - rhs.z;
    }
}