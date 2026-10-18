import type { Request, Response } from "express";
import type { CreateReadingInput, ListReadingsQuery } from "../schemas/reading.schema.js";
import { createReading, getReadingById, listReadings } from "../services/reading.service.js";

export const postReading = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const reading = await createReading(req.params.id, req.body as CreateReadingInput);
  res
    .status(201)
    .location(`/api/readings/${reading.id}`)
    .json({ status: "success", data: { reading } });
};

export const getReading = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const reading = await getReadingById(req.params.id);
  res.status(200).json({ status: "success", data: { reading } });
};

export const getReadings = async (req: Request, res: Response): Promise<void> => {
  const { readings, meta } = await listReadings(req.query as unknown as ListReadingsQuery);
  res.status(200).json({ status: "success", data: { readings }, meta });
};
