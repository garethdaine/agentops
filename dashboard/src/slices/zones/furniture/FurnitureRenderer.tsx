'use client';

import type { FurniturePlacement } from '@/lib/floorplan';
import ServerRack from './ServerRack';
import TrafficLight from './TrafficLight';
import WarRoomScreen from './WarRoomScreen';
import BarrierGate from './BarrierGate';
import ConferenceTable from './ConferenceTable';
import ConferenceChair from './ConferenceChair';
import Whiteboard from './Whiteboard';
import Bookshelf from './Bookshelf';
import FilingCabinet from './FilingCabinet';
import ToolBench from './ToolBench';
import MailStation from './MailStation';
import KitchenCounter from './KitchenCounter';
import PingPongTable from './PingPongTable';
import IdeaBoard from './IdeaBoard';
import AlarmBell from './AlarmBell';

interface FurnitureRendererProps {
  placement: FurniturePlacement;
}

/** Dispatch a furniture placement to its corresponding R3F component. */
export default function FurnitureRenderer({ placement }: FurnitureRendererProps) {
  const { type, position, rotation = 0 } = placement;

  const components: Record<string, React.ComponentType<{
    position: [number, number, number];
    rotation?: number;
    toolType?: string;
    platformColor?: string;
    fillLevel?: number;
  }>> = {
    serverRack: ServerRack,
    trafficLight: TrafficLight,
    screenWall: WarRoomScreen,
    barrierGate: BarrierGate,
    conferenceTable: ConferenceTable,
    conferenceChair: ConferenceChair,
    whiteboard: Whiteboard,
    bookshelf: Bookshelf,
    filingCabinet: FilingCabinet,
    toolBench: ToolBench,
    mailStation: MailStation,
    kitchenCounter: KitchenCounter,
    pingPongTable: PingPongTable,
    ideaBoard: IdeaBoard,
    alarmBell: AlarmBell,
  };

  const Component = components[type];
  if (!Component) return null;

  return (
    <Component
      position={position}
      rotation={rotation}
      toolType={placement.toolType}
      platformColor={placement.platformColor}
      fillLevel={placement.fillLevel}
    />
  );
}
