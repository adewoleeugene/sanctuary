import { deleteActivity } from "@/app/actions/activities";
import { SubmitButton } from "./submit-button";

export function DeleteEventButton({
  id,
  name,
  returnTo,
  className = "btn-danger btn-sm",
  children = "Delete",
}: {
  id: number;
  name: string;
  returnTo?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <form action={deleteActivity} className="has-[[role=alertdialog]]:basis-full">
      <input type="hidden" name="id" value={id} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <SubmitButton
        className={className}
        confirm={`Delete ${name}? Its roles, cleaning, attendance and report will be removed too.`}
        confirmLabel="Yes, delete it"
      >
        {children}
      </SubmitButton>
    </form>
  );
}
