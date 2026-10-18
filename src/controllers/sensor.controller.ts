import type { Request, Response } from "express";
import type { ListSensorsQuery } from "../schemas/sensor.schema.js";
import { getSensorById, listSensors } from "../services/sensor.service.js";

export const getSensors = async (req: Request, res: Response): Promise<void> => {
  const { sensors, meta } = await listSensors(req.query as unknown as ListSensorsQuery);
  res.status(200).json({ status: "success", data: { sensors }, meta });
};

export const getSensor = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const sensor = await getSensorById(req.params.id);
  res.status(200).json({ status: "success", data: { sensor } });
};
