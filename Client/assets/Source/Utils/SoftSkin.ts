
import { _decorator, Component, Node, Mesh, Skeleton, gfx, math, MeshRenderer, utils, assert, Material, warn, Vec3, SkinnedMeshRenderer, RenderingSubMesh } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SoftSkin')
export class SoftSkin extends Component {
    @property(Mesh)
    mesh!: Mesh;

    @property(Node)
    skinningRoot!: Node;

    @property(Skeleton)
    skeleton!: Skeleton;

    @property(Material)
    material: Material | null = null;

    @property(Node)
    renderParent: Node | null = null;

    start () {
        this._convertSkinnedMeshRenderer(this);
    }

    update (_deltaTime: number) {
        for (const skinner of this._skinners) {
            skinner.update();
        }
    }

    private _skinners: Skinner[] = [];

    private _convertSkinnedMeshRenderer ({ mesh, skeleton, skinningRoot, material }: this) {
        const renderParent = this.renderParent ?? this.node;

        for (let iPrimitive = 0; iPrimitive < mesh.struct.primitives.length; ++iPrimitive) {
            const primitive = mesh.struct.primitives[iPrimitive];

            const positionElements = mesh.readAttribute(iPrimitive, gfx.AttributeName.ATTR_POSITION);
            const jointIndices = mesh.readAttribute(iPrimitive, gfx.AttributeName.ATTR_JOINTS);
            const weights = mesh.readAttribute(iPrimitive, gfx.AttributeName.ATTR_WEIGHTS);
            if (!positionElements || !jointIndices || !weights) {
                continue;
            }
            const normals = mesh.readAttribute(iPrimitive, gfx.AttributeName.ATTR_NORMAL);

            const nVertices = positionElements.length / 3;
            asserts(Number.isInteger(nVertices));
            asserts(nVertices * 3 === positionElements.length);
            asserts(nVertices * 4 === jointIndices.length);
            asserts(nVertices * 4 === weights.length);
            if (normals) {
                asserts(nVertices * 3 === normals.length);
            }

            const colors = colorArrayFromFlatted(new Array(4 * nVertices).fill(255.0));

            const indices = mesh.readIndices(iPrimitive);
            const softRenderedPrimitive = utils.createMesh({
                primitiveMode: primitive.primitiveMode,
                positions: Array.from(positionElements),
                indices: indices ? Array.from(indices) : undefined,
                // normals: normals ? Array.from(normals) : undefined,
                // colors: flatColorArray(colors),
            });

            const displayNode = new Node();
            renderParent.addChild(displayNode);
            const meshRenderer = displayNode.addComponent(MeshRenderer) as MeshRenderer;
            meshRenderer.mesh = softRenderedPrimitive;
            if (material) {
                meshRenderer.material = material;
            }

            const skinner = new Skinner(
                nVertices,
                vec3ArrayFromFlatted(positionElements),
                normals ? vec3ArrayFromFlatted(normals) : undefined,
                jointIndices,
                weights,
                skeleton,
                skinningRoot,
                softRenderedPrimitive.renderingSubMeshes,
            );
            this._skinners.push(skinner);
        }
    }
}

function asserts(expr: any): asserts expr is true {
    assert(expr);
}

function flatVec3Array(array: Vec3[]) {
    const flatted = new Array<number>(3 * array.length);
    for (let iVec3 = 0; iVec3 < array.length; ++iVec3) {
        const skinnedPosition = array[iVec3];
        flatted[3 * iVec3 + 0] = skinnedPosition.x;
        flatted[3 * iVec3 + 1] = skinnedPosition.y;
        flatted[3 * iVec3 + 2] = skinnedPosition.z;
    }
    return flatted;
}

function vec3ArrayFromFlatted(elements: ArrayLike<number>) {
    const result = new Array<math.Vec3>(elements.length / 3);
    for (let iVec3 = 0; iVec3 < result.length; ++iVec3) {
        result[iVec3] = new math.Vec3(
            elements[3 * iVec3 + 0],
            elements[3 * iVec3 + 1],
            elements[3 * iVec3 + 2],
        );
    }
    return result;
}

function colorArrayFromFlatted(elements: ArrayLike<number>) {
    const result = new Array<math.Color>(elements.length / 4);
    for (let iColor = 0; iColor < result.length; ++iColor) {
        result[iColor] = new math.Color(
            elements[4 * iColor + 0],
            elements[4 * iColor + 1],
            elements[4 * iColor + 2],
            elements[4 * iColor + 3],
        );
    }
    return result;
}

function flatColorArray(array: math.Color[]) {
    const flatted = new Array<number>(4 * array.length);
    for (let iColor = 0; iColor < array.length; ++iColor) {
        const color = array[iColor];
        flatted[4 * iColor + 0] = color.r / 255.0;
        flatted[4 * iColor + 1] = color.g / 255.0;
        flatted[4 * iColor + 2] = color.b / 255.0;
        flatted[4 * iColor + 2] = color.a / 255.0;
    }
    return flatted;
}

class Skinner {
    constructor(
        nVertices: number,
        vertexPositions: Array<Vec3>,
        vertexNormals: Array<Vec3> | undefined,
        vertexJoints: ArrayLike<number>,
        vertexWeights: ArrayLike<number>,
        skeleton: Skeleton,
        skinningRoot: Node,
        renderResult: RenderingSubMesh[],
    ) {
        this._nVertices = nVertices;
        this._vertexPositions = vertexPositions;
        this._vertexNormals = vertexNormals;;
        this._vertexJoints = vertexJoints;
        this._vertexWeights = vertexWeights;
        this._jointMatrices = skeleton.joints.map(() => new math.Mat4());
        this._inverseBindMatrices = skeleton.inverseBindposes;
        this._jointNodes = skeleton.joints.map((jointPath, iJoint) => {
            const jointNode = skinningRoot.getChildByPath(jointPath);
            if (jointNode) {
                return jointNode;
            } else {
                warn(`Cannot find joint: ${jointPath}`);
                this._jointMatrices[iJoint].set(skeleton.inverseBindposes[iJoint]);
                return null;
            }
        });
        this._renderResult = renderResult;
        this._skinnedPositions = new Float32Array(3 * nVertices);
        this._skinnedNormals = new Float32Array(3 * nVertices);
        const vertexBundles: Mesh.IVertexBundle[] = [
            {
                view: {
                    offset: 0,
                    length: this._skinnedPositions.byteLength,
                    count: nVertices,
                    stride: 3 * this._skinnedPositions.byteLength,
                },
                attributes: [new gfx.Attribute(
                    gfx.AttributeName.ATTR_POSITION,
                    gfx.Format.RGB32F,
                    false,
                    0,
                    false,
                    0,
                )],
            },
        ];
        
        const meshStructure: Mesh.IStruct = {
            vertexBundles,
            primitives: [{
                primitiveMode: gfx.PrimitiveMode.TRIANGLE_LIST,
                vertexBundelIndices: new Array(vertexBundles.length).fill(0).map((_, i) => i),
            }],
        };
        
        const mesh = new Mesh();
        mesh.reset({
            struct: meshStructure,
            data: new Uint8Array(this._skinnedPositions.buffer),
        });
    }

    update() {
        this._updateJoints();
        this._updateVertices();
        this._updateRenderData();
    }

    private _nVertices: number;
    private _vertexPositions: Vec3[];
    private _vertexNormals: Vec3[] | undefined;
    private _vertexWeights: ArrayLike<number>;
    private _vertexJoints: ArrayLike<number>;
    private _skinnedPositions: Float32Array;
    private _skinnedNormals: Float32Array;
    private _inverseBindMatrices: math.Mat4[];
    private _jointNodes: Array<Node | null>;
    private _jointMatrices: math.Mat4[];
    private _renderResult: RenderingSubMesh[];

    private _updateJoints() {
        this._jointNodes.forEach((jointNode, jointIndex) => {
            const inverseBindMatrix = this._inverseBindMatrices[jointIndex];
            if (jointNode) {
                math.Mat4.multiply(this._jointMatrices[jointIndex], jointNode.getWorldMatrix(), inverseBindMatrix);
            }
        });
    }

    private _updateVertices() {
        const sumMatrix = new math.Mat4();
        const v3 = new math.Vec3();
        const {
            _nVertices: nVertices,
            _vertexWeights: weights,
            _vertexJoints: jointIndices,
            _skinnedPositions: skinnedPositions,
            _skinnedNormals: skinnedNormals,
            _jointMatrices: jointMatrices,
            _vertexPositions: vertexPositions,
            _vertexNormals: vertexNormals,
        } = this;

        for (let iVertex = 0; iVertex < nVertices; ++iVertex) {
            sumMatrix.zero();

            for (let iInfluenceElement = 0; iInfluenceElement < 4; ++iInfluenceElement) {
                const influenceIndex = 4 * iVertex + iInfluenceElement;
                const weight = weights[influenceIndex];
                if (!weight) {
                    continue;
                }
                const jointIndex = jointIndices[influenceIndex];
                const jointMatrix = jointMatrices[jointIndex];
                math.Mat4.multiplyScalarAndAdd(sumMatrix, sumMatrix, jointMatrix, weight);
            }

            v3.set(vertexPositions[iVertex]);
            const skinnedPosition = v3;
            math.Vec3.transformMat4(skinnedPosition, skinnedPosition, sumMatrix);
            math.Vec3.toArray(skinnedPositions, skinnedPosition, 3 * iVertex);

            if (vertexNormals) {
                v3.set(vertexNormals[iVertex]);
                const skinnedNormal = v3;
                math.Vec3.transformMat4Normal(skinnedNormal, skinnedNormal, sumMatrix);
                math.Vec3.toArray(skinnedNormals, skinnedPosition, 3 * iVertex);
            }
        }
    }

    private _updateRenderData() {
        const {
            _renderResult: renderResult,
        } = this;

        for (const renderingSubMesh of renderResult) {
            for (const attribute of renderingSubMesh.attributes) {
                switch (attribute.name) {
                    case gfx.AttributeName.ATTR_POSITION: {
                        const vertexBuffer = renderingSubMesh.vertexBuffers[attribute.stream];
                        vertexBuffer.update(this._skinnedPositions);
                        break;
                    }
                    case gfx.AttributeName.ATTR_NORMAL:
                        break;
                }
            }
        }
    }
}