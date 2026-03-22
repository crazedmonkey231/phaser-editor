export type GameObjectType = 'rectangle' | 'circle' | 'text' | 'image';

export interface BaseGameObject {
  id: string;
  type: GameObjectType;
  name: string;
  x: number;
  y: number;
  rotation: number;
  alpha: number;
  depth: number;
  visible: boolean;
  script?: string;
}

export interface RectangleObject extends BaseGameObject {
  type: 'rectangle';
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface CircleObject extends BaseGameObject {
  type: 'circle';
  radius: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface TextObject extends BaseGameObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
}

export interface ImageObject extends BaseGameObject {
  type: 'image';
  imageKey: string;
  scaleX: number;
  scaleY: number;
}

export type AnyGameObject = RectangleObject | CircleObject | TextObject | ImageObject;

export interface SceneData {
  id: string;
  name: string;
  backgroundColor: string;
  width: number;
  height: number;
  objects: AnyGameObject[];
  script: string;
}
