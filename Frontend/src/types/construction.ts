export type ConstructionStatusType =
  | "compoundable"
  | "partly_compoundable"
  | "non_compoundable"
  | "";

export interface CompoundableDetails {
  assessmentStatus: string;
  totalCharges: string;
  assessmentDate: string;
  receiptNumber: string;
  receiptDate: string;
  receiptPhoto: File | null;
}

export interface NonCompoundableDetails {
  noticeNumber: string;
  noticeDate: string;
  noticePhoto: File | null;
}

export type ConstructionStatusPayload =
  | {
      status: "compoundable";
      compoundable: CompoundableDetails;
    }
  | {
      status: "non_compoundable";
      nonCompoundable: NonCompoundableDetails;
    }
  | {
      status: "partly_compoundable";
      compoundable: CompoundableDetails;
      nonCompoundable: NonCompoundableDetails;
    };

export interface ConstructionFormPayload {
  replyByViolator?: string;
  replyPhoto?: File | null;
  constructionStatus: ConstructionStatusPayload;
}

