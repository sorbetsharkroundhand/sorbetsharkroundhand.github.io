import type { ScrollSceneController } from '../../scrollytelling/ScrollSceneController';
import type { HomeAsciiFieldOptions } from '../../scrollytelling/home/HomeAsciiField';
import type { HomeTopologyControllerOptions } from '../../scrollytelling/home/HomeTopologyController';

export async function createHomeTopology(
  container: HTMLElement,
  options: HomeTopologyControllerOptions,
): Promise<ScrollSceneController> {
  const { HomeTopologyController } = await import(
    '../../scrollytelling/home/HomeTopologyController'
  );
  return HomeTopologyController.create(container, options);
}

export async function createHomeAscii(
  canvas: HTMLCanvasElement,
  options: HomeAsciiFieldOptions,
): Promise<ScrollSceneController> {
  const { HomeAsciiField } = await import('../../scrollytelling/home/HomeAsciiField');
  return new HomeAsciiField(canvas, options);
}
