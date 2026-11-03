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
import { buildSteamFlowCzml, pipeAltitude } from '../data/czml'
import { nodes, pipelines } from '../data/network'

interface NetworkViewerProps {
  onSelectPipeline: (pipelineId: string) => void
}

const PIPELINE_ID_PREFIX = 'pipeline:'

/** 高德开放平台栅格底图（无需 key 的公开瓦片服务），由 Cesium 直接加载 */
const AMAP_TILE_URL =
  'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'

const SUPPLIER_COLOR = Color.fromCssColorString('#ffb648')
const USER_COLOR = Color.fromCssColorString('#36e2ff')
const MAIN_PIPE_COLOR = Color.fromCssColorString('#4fe4ff')
const BRANCH_PIPE_COLOR = Color.fromCssColorString('#59ffc9')

export default function NetworkViewer({ onSelectPipeline }: NetworkViewerProps) {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer> | null>(null)
  const selectRef = useRef(onSelectPipeline)
  selectRef.current = onSelectPipeline

  /** 管线：发光线宽 + 略微抬升，形成三维管网骨架 */
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
          pad: isSupplier ? 3600 : 2400,
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

      // 中心点位于山东—江苏交界（连云港主城西北），俯瞰整个蒸汽管网
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(119.31, 34.36, 82000),
        orientation: {
          heading: CesiumMath.toRadians(2),
          pitch: CesiumMath.toRadians(-62),
          roll: 0,
        },
      })

      // CZML 蒸汽流动数据
      CzmlDataSource.load(buildSteamFlowCzml()).then((dataSource) => {
        if (disposed) {
          return
        }
        viewer.dataSources.add(dataSource)
        viewer.clock.multiplier = 4
        viewer.clock.shouldAnimate = true
      })

      // 点击 / 悬停管线
      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
      const pickPipelineId = (position: Cartesian2): string | null => {
        const picked = viewer.scene.pick(position)
        const target = picked?.id
        if (
          target instanceof CesiumEntity &&
          typeof target.id === 'string' &&
          target.id.startsWith(PIPELINE_ID_PREFIX)
        ) {
          return target.id.slice(PIPELINE_ID_PREFIX.length)
        }
        return null
      }

      handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
        const pipelineId = pickPipelineId(event.position)
        if (pipelineId) {
          selectRef.current(pipelineId)
        }
      }, ScreenSpaceEventType.LEFT_CLICK)

      handler.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
        const pipelineId = pickPipelineId(event.endPosition)
        viewer.scene.canvas.style.cursor = pipelineId ? 'pointer' : 'default'
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

      {nodeEntities.map(({ node, isSupplier, height, color, position, pad }) => (
        <Entity key={node.id} id={`node:${node.id}`} name={node.name} position={position}>
          <CylinderGraphics
            length={height}
            topRadius={isSupplier ? 1400 : 1000}
            bottomRadius={isSupplier ? 2300 : 1700}
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
            pixelSize={isSupplier ? 13 : 10}
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
    </Viewer>
  )
}
