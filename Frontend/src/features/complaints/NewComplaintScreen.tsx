import ComplaintFormPage from "../../pages/ComplaintFormPage";

type NewComplaintScreenProps = {
  navigate: (route: string) => void;
  setSelectedComplaintId: (id: string) => void;
};

/**
 * Entry point for the "New complaint" route.
 * The form handles both registration routes (manual entry + external source upload)
 * in a single page — no choice screen needed.
 */
function NewComplaintScreen({ navigate, setSelectedComplaintId }: NewComplaintScreenProps) {
  return (
    <ComplaintFormPage
      navigate={navigate}
      setSelectedComplaintId={setSelectedComplaintId}
    />
  );
}

export default NewComplaintScreen;
