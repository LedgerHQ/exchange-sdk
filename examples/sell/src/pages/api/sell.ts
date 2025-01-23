import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  recipientAddress: string;
  amount: string;
  binaryPayload: string;
  signature: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  console.log("Call receive:", req.query);

  const { amount } = req.query;

  const recipientAddress = "bc1q6dpklmv02d7eg978dj8u0vlwc4aney8ddhuyck";
  const binaryPayload = "Cwiop";
  const signature = "XXXX";

  const sellTx = {
    recipientAddress,
    amount: amount as string,
    binaryPayload,
    signature,
  };
  res.status(200).json(sellTx);
}
