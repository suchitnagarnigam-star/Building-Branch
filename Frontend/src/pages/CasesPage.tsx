import ComingSoonPage from "../shared/components/ComingSoonPage";

type CasesPageProps = {
  navigate?: (route: string) => void;
};

export default function CasesPage({ navigate: _navigate }: CasesPageProps) {
  return <ComingSoonPage title="Cases" />;
}
