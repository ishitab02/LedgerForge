export interface X402PaymentDetails {
  scheme: "exact";
  network: `eip155:${number}`;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: `0x${string}`;
  skillId: number;
  extra?: {
    name: string;
    version: string;
  };
}

export interface X402PaymentProof {
  scheme: "exact";
  network: "eip155:5000";
  payload: {
    signature: `0x${string}`;
    authorization: {
      from: `0x${string}`;
      to: `0x${string}`;
      amount: string;
      token: `0x${string}`;
      skillId: number;
      nonce: number;
      validBefore: number;
    };
  };
  reputationScore?: number;
}

export interface FacilitateRequest {
  paymentDetails: X402PaymentDetails;
  paymentProof: X402PaymentProof;
}

export interface FacilitateResponse {
  success: boolean;
  settlementTxHash?: `0x${string}`;
  accessToken?: string;
  error?: string;
}
