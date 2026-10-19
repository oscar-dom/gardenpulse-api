import type { Request, Response } from "express";
import type {
  CreateSensorInput,
  DeleteSensorQuery,
  ListSensorsQuery,
  UpdateSensorInput,
} from "../schemas/sensor.schema.js";
import {
  createSensor,
  deleteSensor,
  getSensorById,
  listSensors,
  updateSensor,
} from "../services/sensors.service.js";
import { buildPaginationMeta } from "../services/pagination.service.js";

export const getSensors = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListSensorsQuery;
  const { sensors, total } = await listSensors(query);
  const meta = buildPaginationMeta(query, total, req.originalUrl);
  res.status(200).json({ status: "success", data: { sensors }, meta });
};

export const getSensor = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const sensor = await getSensorById(req.params.id);
  res.status(200).json({ status: "success", data: { sensor } });
};

export const postSensor = async (req: Request, res: Response): Promise<void> => {
  const sensor = await createSensor(req.body as CreateSensorInput);
  // 201 + Location: the standard way to point at a newly created resource.
  res
    .status(201)
    .location(`${req.baseUrl}/${sensor.id}`)
    .json({ status: "success", data: { sensor } });
};

export const patchSensor = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const sensor = await updateSensor(req.params.id, req.body as UpdateSensorInput);
  res.status(200).json({ status: "success", data: { sensor } });
};

// 204 No Content: the sensor is gone, so there is nothing to send back.
export const removeSensor = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  await deleteSensor(req.params.id, req.query as unknown as DeleteSensorQuery);
  res.status(204).end();
};
