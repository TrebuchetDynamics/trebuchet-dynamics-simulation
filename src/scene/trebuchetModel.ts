import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3,
} from 'three'
import type { Design } from '../sim/design'
import { cockedPose, type MechanismState } from '../sim/mechanism'
import { theme } from '../theme'

const up = new Vector3(0, 1, 0)

/** Unit-height primitives keep lengths readable directly from their transforms. */
function beam(material: MeshStandardMaterial, width: number): Mesh {
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), material)
  mesh.scale.set(width, 1, width)
  return mesh
}

function between(part: Mesh, from: Vector3, to: Vector3): void {
  const direction = to.clone().sub(from)
  part.position.copy(from).add(to).multiplyScalar(0.5)
  part.scale.y = direction.length()
  if (direction.lengthSq() > 0) part.quaternion.setFromUnitVectors(up, direction.normalize())
}

export function buildTrebuchetModel(design: Design) {
  const pose = cockedPose(design)
  if (!pose) throw new RangeError('Design cannot form a cocked pose')
  const group = new Group()
  const wood = new MeshStandardMaterial({ color: theme.wood, roughness: 0.85 })
  const steel = new MeshStandardMaterial({ color: theme.steel, metalness: 0.65, roughness: 0.4 })
  const stone = new MeshStandardMaterial({ color: theme.text, roughness: 0.9 })
  const h = design.pivotHeight, width = h * 0.6, thickness = h * 0.065
  const pivot = new Group()
  pivot.position.y = h
  const axle = new Mesh(new CylinderGeometry(thickness * 0.65, thickness * 0.65, width * 2.3, 16), steel)
  axle.rotation.x = Math.PI / 2
  pivot.add(axle)
  group.add(pivot)

  for (const z of [-width, width]) {
    for (const x of [-h * 0.65, h * 0.65]) {
      const leg = beam(wood, thickness)
      between(leg, new Vector3(x, 0, z), new Vector3(0, h, z))
      group.add(leg)
    }
    const base = beam(wood, thickness)
    between(base, new Vector3(-h * 0.85, thickness / 2, z), new Vector3(h * 0.85, thickness / 2, z))
    group.add(base)
  }
  const trough = new Mesh(new BoxGeometry(design.longArmLength + design.slingLength, thickness * 0.25, width * 0.5), wood)
  trough.position.set((pose.armTip[0] + pose.projectile[0]) / 2, -thickness * 0.2, 0)
  group.add(trough)
  const arm = beam(wood, thickness * 0.8)
  const hanger = beam(steel, thickness * 0.28)
  const sling = new Mesh(new CylinderGeometry(0.012, 0.012, 1, 8), steel)
  const projectile = new Mesh(new SphereGeometry(design.projectileDiameter / 2, 16, 12), stone)
  // Counterweight volume is derived from mass with a stone-fill density (kg/m³).
  const side = Math.cbrt(design.counterweightMass / 2400)
  const counterweight = new Mesh(new BoxGeometry(side, side, side), steel)
  group.add(arm, hanger, sling, projectile, counterweight)
  const model = { group, pivot, arm, hanger, sling, projectile, counterweight }
  applyMechanismState(model, pose)
  return model
}

export type TrebuchetModel = ReturnType<typeof buildTrebuchetModel>

/** Copy the solver's Cartesian geometry; the renderer never integrates physics. */
export function applyMechanismState(model: TrebuchetModel, state: MechanismState): void {
  const tip = new Vector3(...state.armTip, 0)
  const hinge = new Vector3(...state.hinge, 0)
  const weight = new Vector3(...state.counterweight, 0)
  const projectile = new Vector3(...state.projectile, 0)
  between(model.arm, hinge, tip)
  between(model.hanger, hinge, weight)
  between(model.sling, tip, projectile)
  model.projectile.position.copy(projectile)
  model.counterweight.position.copy(weight)
}
