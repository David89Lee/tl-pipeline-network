import { useEffect, useMemo, useRef } from 'react'
import {
  Cartesian2,
  Cartesian3,
  Color,
  CzmlDataSource,
  DistanceDisplayCondition,
  Entity as CesiumEntity,
  HeightReference,
  LabelStyle,
  Math as CesiumMath,
  PolylineGlowMaterialProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  VerticalOrigin,
} from 'cesium'
import {
  CylinderGraphics,
  EllipseGraphics,
  Entity,
  LabelGraphics,
  PointGraphics,
  PolylineGraphics,
  Viewer,
} from 'resium'
import type { CesiumComponentRef } from 'resium'
import type { Viewer as CesiumViewer } from 'cesium'
import { buildFlowCzml, pipeAltitude } from '../data/czml'
import { nodes, pipelines } from '../data/network'
import { lngNodes, lngPipelines } from '../data/lngNetwork'

/** 管网类型：连云港蒸汽热网 / 龙口 LNG 冷网 */
export type NetworkKind = 'steam' | 'lng'

interface NetworkViewerProps {
  onSelectPipeline: (pipelineId: string, network: NetworkKind) => void
}

const PIPELINE_ID_PREFIX = 'pipeline:'
const LNG_PIPELINE_ID_PREFIX = 'lng-pipeline:'

/** 高德开放平台栅格底图（无需 key 的公开瓦片服务），由 Cesium 直接加载 */
const AMAP_TILE_URL =
  'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'

// 连云港蒸汽热网配色：橘红系
const SUPPLIER_COLOR = Color.fromCssColorString('#ffa866')
const USER_COLOR = Color.fromCssColorString('#ff6b35')
const MAIN_PIPE_COLOR = Color.fromCssColorString('#ff6b35')
const BRANCH_PIPE_COLOR = Color.fromCssColorString('#ffb347')

// 龙口 LNG 冷网配色：冰蓝系，与热网橘红明确区分
const LNG_SUPPLIER_COLOR = Color.fromCssColorString('#a8d8ff')
const LNG_USER_COLOR = Color.fromCssColorString('#7ec5ff')
const LNG_MAIN_PIPE_COLOR = Color.fromCssColorString('#7ec5ff')
const LNG_BRANCH_PIPE_COLOR = Color.fromCssColorString('#b0dcff')

export default function NetworkViewer({ onSelectPipeline }: NetworkViewerProps) {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer> | null>(null)
  const selectRef = useRef(onSelectPipeline)
  selectRef.current = onSelectPipeline

  /** 热网管线：发光线宽 + 略微抬升，形成三维管网骨架 */
  const pipelineEntities = useMemo(
    () =>
      pipelines.map((pipe, index) => ({
        pipe,
        positions: Cartesian3.fromDegreesArrayHeights(
          pipe.points.flatMap(([lon, lat]) => [lon, lat, pipeAltitude(index)]),
        ),
        material: new PolylineGlowMaterialProperty({
          color: (pipe.level === 'main' ? MAIN_PIPE_COLOR : BRANCH_PIPE_COLOR).withAlpha(0.9),
          glowPower: 0.26,
          taperPower: 0.72,
        }),
        width: pipe.level === 'main' ? 9 : 6,
      })),
    [],
  )

  /** 冷网管线：冰蓝 / 淡紫发光，与热网青色骨架一眼区分 */
  const lngPipelineEntities = useMemo(
    () =>
      lngPipelines.map((pipe, index) => ({
        pipe,
        positions: Cartesian3.fromDegreesArrayHeights(
          pipe.points.flatMap(([lon, lat]) => [lon, lat, pipeAltitude(index)]),
        ),
        material: new PolylineGlowMaterialProperty({
          color: (pipe.level === 'main' ? LNG_MAIN_PIPE_COLOR : LNG_BRANCH_PIPE_COLOR).withAlpha(
            0.9,
          ),
          glowPower: 0.26,
          taperPower: 0.72,
        }),
        width: pipe.level === 'main' ? 9 : 6,
      })),
    [],
  )

  /** 上游热源 / 下游用户的三维站体 */
  const nodeEntities = useMemo(
    () =>
      nodes.map((node) => {
        const isSupplier = node.kind === 'supplier'
        const height = isSupplier ? 2400 : 1600
        const color = isSupplier ? SUPPLIER_COLOR : USER_COLOR
        return {
          node,
          isSupplier,
          height,
          color,
          position: Cartesian3.fromDegrees(node.lon, node.lat, height / 2),
          labelPosition: Cartesian3.fromDegrees(node.lon, node.lat, height + 300),
          pad: isSupplier ? 2400 : 1600,
        }
      }),
    [],
  )

  /** 冷网上游冷源 / 下游用冷企业的三维站体 */
  const lngNodeEntities = useMemo(
    () =>
      lngNodes.map((node) => {
        const isSupplier = node.kind === 'supplier'
        const height = isSupplier ? 2400 : 1600
        const color = isSupplier ? LNG_SUPPLIER_COLOR : LNG_USER_COLOR
        return {
          node,
          isSupplier,
          height,
          color,
          position: Cartesian3.fromDegrees(node.lon, node.lat, height / 2),
          labelPosition: Cartesian3.fromDegrees(node.lon, node.lat, height + 300),
          pad: isSupplier ? 2400 : 1600,
        }
      }),
    [],
  )

  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanups: (() => void)[] = []

    const setup = () => {
      const viewer = viewerRef.current?.cesiumElement
      if (!viewer) {
        if (!disposed) timer = setTimeout(setup, 120)
        return
      }

      // 深色底图氛围
      viewer.scene.globe.baseColor = Color.fromCssColorString('#061523')
      viewer.scene.backgroundColor = Color.fromCssColorString('#02070f')
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = false
      }
      viewer.scene.globe.showGroundAtmosphere = false
      viewer.scene.fog.enabled = false
      viewer.scene.postProcessStages.fxaa.enabled = true

      const credit = viewer.cesiumWidget.creditContainer
      if (credit instanceof HTMLElement) {
        credit.style.display = 'none'
      }

      // 高德 GIS 底图替换默认影像
      viewer.imageryLayers.removeAll()
      const amapLayer = viewer.imageryLayers.addImageryProvider(
        new UrlTemplateImageryProvider({
          url: AMAP_TILE_URL,
          subdomains: ['1', '2', '3', '4'],
          maximumLevel: 18,
          minimumLevel: 3,
        }),
      )
      amapLayer.brightness = 0.34
      amapLayer.contrast = 1.42
      amapLayer.saturation = 0.24
      amapLayer.gamma = 0.76

      // 中心点移至山东中部偏东，拉高视角，同时俯瞰连云港热网与龙口冷网
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(119.393750, 31.060793, 750000),
        orientation: {
          heading: CesiumMath.toRadians(2),
          pitch: CesiumMath.toRadians(-58),
          roll: 0,
        },
      })

      // 双网介质流动 CZML 数据
      CzmlDataSource.load(buildFlowCzml()).then((dataSource) => {
        if (disposed) {
          return
        }
        viewer.dataSources.add(dataSource)

        // 禁用自动挂起：默认开启时 DataSource 更新返回 false 会冻结时钟，动画永远不播放
        viewer.allowDataSourcesToSuspendAnimation = false

        // 显式同步 CZML 时钟到 viewer，避免自动跟踪的时序竞态
        const dsClock = dataSource.clock
        if (dsClock) {
          viewer.clock.startTime = dsClock.startTime
          viewer.clock.stopTime = dsClock.stopTime
          viewer.clock.currentTime = dsClock.currentTime
          viewer.clock.clockRange = dsClock.clockRange
          viewer.clock.multiplier = dsClock.multiplier
        }
        viewer.clock.shouldAnimate = true
      })

      // 点击 / 悬停管线（热网 + 冷网）
      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
      const pickPipeline = (position: Cartesian2): { id: string; network: NetworkKind } | null => {
        const picked = viewer.scene.pick(position)
        const target = picked?.id
        if (target instanceof CesiumEntity && typeof target.id === 'string') {
          if (target.id.startsWith(PIPELINE_ID_PREFIX)) {
            return { id: target.id.slice(PIPELINE_ID_PREFIX.length), network: 'steam' }
          }
          if (target.id.startsWith(LNG_PIPELINE_ID_PREFIX)) {
            return { id: target.id.slice(LNG_PIPELINE_ID_PREFIX.length), network: 'lng' }
          }
        }
        return null
      }

      handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
        const hit = pickPipeline(event.position)
        if (hit) {
          selectRef.current(hit.id, hit.network)
        }
      }, ScreenSpaceEventType.LEFT_CLICK)

      handler.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
        const hit = pickPipeline(event.endPosition)
        viewer.scene.canvas.style.cursor = hit ? 'pointer' : 'default'
      }, ScreenSpaceEventType.MOUSE_MOVE)

      cleanups.push(() => handler.destroy())
    }

    setup()

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return (
    <Viewer
      ref={viewerRef}
      className="network-viewer"
      full
      animation={false}
      timeline={false}
      baseLayerPicker={false}
      geocoder={false}
      homeButton={false}
      infoBox={false}
      selectionIndicator={false}
      sceneModePicker={false}
      navigationHelpButton={false}
      fullscreenButton={false}
      scene3DOnly
    >
      {pipelineEntities.map(({ pipe, positions, material, width }) => (
        <Entity
          key={pipe.id}
          id={`${PIPELINE_ID_PREFIX}${pipe.id}`}
          name={pipe.name}
          show
        >
          <PolylineGraphics
            positions={positions}
            width={width}
            material={material}
            clampToGround={false}
          />
        </Entity>
      ))}

      {lngPipelineEntities.map(({ pipe, positions, material, width }) => (
        <Entity
          key={pipe.id}
          id={`${LNG_PIPELINE_ID_PREFIX}${pipe.id}`}
          name={pipe.name}
          show
        >
          <PolylineGraphics
            positions={positions}
            width={width}
            material={material}
            clampToGround={false}
          />
        </Entity>
      ))}

      {nodeEntities.map(({ node, isSupplier, height, color, position, pad }) => (
        <Entity key={node.id} id={`node:${node.id}`} name={node.name} position={position}>
          <CylinderGraphics
            length={height}
            topRadius={isSupplier ? 1200 : 800}
            bottomRadius={isSupplier ? 2000 : 1400}
            numberOfVerticalLines={16}
            heightReference={HeightReference.NONE}
            material={color.withAlpha(0.62)}
            outline
            outlineColor={color}
          />
          <EllipseGraphics
            semiMajorAxis={pad}
            semiMinorAxis={pad}
            height={0}
            material={color.withAlpha(0.14)}
            outline
            outlineColor={color.withAlpha(0.55)}
          />
          <PointGraphics
            pixelSize={isSupplier ? 6 : 5}
            color={color}
            outlineColor={Color.fromCssColorString('#03101c')}
            outlineWidth={3}
            disableDepthTestDistance={Number.POSITIVE_INFINITY}
          />
        </Entity>
      ))}

      {lngNodeEntities.map(({ node, isSupplier, height, color, position, pad }) => (
        <Entity key={node.id} id={`node:${node.id}`} name={node.name} position={position}>
          <CylinderGraphics
            length={height}
            topRadius={isSupplier ? 1200 : 800}
            bottomRadius={isSupplier ? 2000 : 1400}
            numberOfVerticalLines={16}
            heightReference={HeightReference.NONE}
            material={color.withAlpha(0.62)}
            outline
            outlineColor={color}
          />
          <EllipseGraphics
            semiMajorAxis={pad}
            semiMinorAxis={pad}
            height={0}
            material={color.withAlpha(0.14)}
            outline
            outlineColor={color.withAlpha(0.55)}
          />
          <PointGraphics
            pixelSize={isSupplier ? 6 : 5}
            color={color}
            outlineColor={Color.fromCssColorString('#03101c')}
            outlineWidth={3}
            disableDepthTestDistance={Number.POSITIVE_INFINITY}
          />
        </Entity>
      ))}

      {nodeEntities.map(({ node, isSupplier, color, labelPosition }) => (
        <Entity key={`label-${node.id}`} id={`node-label:${node.id}`} position={labelPosition}>
          <LabelGraphics
            text={`${node.name}\n${isSupplier ? '上游热源' : '下游用户'} · ${node.capacity} t/h`}
            font='600 14px "Microsoft YaHei", sans-serif'
            fillColor={color}
            outlineColor={Color.fromCssColorString('#02101c')}
            outlineWidth={4}
            style={LabelStyle.FILL_AND_OUTLINE}
            verticalOrigin={VerticalOrigin.BOTTOM}
            pixelOffset={new Cartesian2(0, -8)}
            showBackground
            backgroundColor={Color.fromCssColorString('#04131f').withAlpha(0.72)}
            backgroundPadding={new Cartesian2(10, 6)}
            disableDepthTestDistance={Number.POSITIVE_INFINITY}
            distanceDisplayCondition={
              new DistanceDisplayCondition(1200, 150000)
            }
          />
        </Entity>
      ))}

      {lngNodeEntities.map(({ node, isSupplier, color, labelPosition }) => (
        <Entity
          key={`lng-label-${node.id}`}
          id={`lng-node-label:${node.id}`}
          position={labelPosition}
        >
          <LabelGraphics
            text={`${node.name}\n${isSupplier ? '上游冷源' : '下游用户'} · ${node.capacity} t/h`}
            font='600 14px "Microsoft YaHei", sans-serif'
            fillColor={color}
            outlineColor={Color.fromCssColorString('#02101c')}
            outlineWidth={4}
            style={LabelStyle.FILL_AND_OUTLINE}
            verticalOrigin={VerticalOrigin.BOTTOM}
            pixelOffset={new Cartesian2(0, -8)}
            showBackground
            backgroundColor={Color.fromCssColorString('#0a0f24').withAlpha(0.72)}
            backgroundPadding={new Cartesian2(10, 6)}
            disableDepthTestDistance={Number.POSITIVE_INFINITY}
            distanceDisplayCondition={
              new DistanceDisplayCondition(1200, 150000)
            }
          />
        </Entity>
      ))}
    </Viewer>
  )
}
