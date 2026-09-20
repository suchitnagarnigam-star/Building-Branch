import ComingSoonPage from "../shared/components/ComingSoonPage";

type CaseDetailPageProps = {
  caseId: string;
  navigate?: (route: string) => void;
};

export default function CaseDetailPage({ caseId, navigate: _navigate }: CaseDetailPageProps) {
  return <ComingSoonPage title={`Case ${caseId}`} />;
}
