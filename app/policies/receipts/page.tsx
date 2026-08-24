import { Card, PageTitle } from "@/components/ui";

export const metadata = {
  title: "How we handle receipts and documents — CarFix",
  description:
    "Receipts and business documents are deleted the moment a decision is made. Reviewers have 120 seconds to look.",
};

/*
  The retention policy, written plainly and in public.

  It is short because the policy itself is short: we look, we decide, we
  delete. Publishing it is part of the point — someone deciding whether to
  upload a receipt deserves to know exactly what happens to it.
*/
export default function ReceiptPolicyPage() {
  return (
    <div className="max-w-2xl">
      <PageTitle
        title="What happens to your receipt"
        subtitle="Short version: we look at it once, then it is gone."
      />

      <div className="space-y-4">
        <Card>
          <h2 className="text-headline font-semibold mb-2">We delete it. Permanently.</h2>
          <p className="text-body text-pretty">
            The moment a reviewer approves or rejects your submission, the file
            is deleted from storage and the pointer to it is erased — in the
            same operation that records the decision. There is no archive, no
            backup copy, and no way for us to retrieve it afterwards. Not for
            you, not for a shop, not for ourselves.
          </p>
        </Card>

        <Card>
          <h2 className="text-headline font-semibold mb-2">A reviewer gets 120 seconds</h2>
          <p className="text-body text-pretty">
            Reviewers cannot browse uploaded documents. When one opens yours,
            the system generates a link that stops working after two minutes,
            records who opened it and when, and hands it only to that person&rsquo;s
            own signed-in browser. Nothing is emailed. Nothing is downloaded to
            a shared place. Once those two minutes pass the link is dead, and
            once the decision is made the file behind it is gone forever.
          </p>
        </Card>

        <Card>
          <h2 className="text-headline font-semibold mb-2">Only two things are checked</h2>
          <p className="text-body text-pretty">
            The name of the business and the total you reported. That is the
            entire purpose. Where the check can be made automatically it is, and
            the file is deleted without any person seeing it at all. We do not
            read, extract, or store anything else that happens to be on the
            page.
          </p>
        </Card>

        <Card>
          <h2 className="text-headline font-semibold mb-2">What we keep</h2>
          <p className="text-body">Three facts, and nothing that could reconstruct the document:</p>
          <ul className="mt-3 space-y-1.5 text-body text-secondary">
            <li>· whether it was verified</li>
            <li>· that a receipt was the method</li>
            <li>· when the decision was made</li>
          </ul>
          <p className="text-body mt-3 text-pretty">
            Publicly, all anyone ever sees is a badge saying the price was
            verified. Your receipt is never shown to anyone, including the shop
            it names.
          </p>
        </Card>

        <Card>
          <h2 className="text-headline font-semibold mb-2">Why it works this way</h2>
          <p className="text-body text-pretty">
            A service receipt can carry your name, your address, your
            registration, your VIN, and part of a card number. Keeping that
            after we have finished with it would create a pile of personal data
            worth stealing, in exchange for nothing — the decision has already
            been made. The safest way to hold sensitive information is not to
            hold it.
          </p>
        </Card>

        <Card>
          <h2 className="text-headline font-semibold mb-2">Business documents too</h2>
          <p className="text-body text-pretty">
            The same applies to anything a shop uploads to prove it trades under
            a name — licence, utility bill, insurance certificate. Reviewed
            once, under the same two-minute link, deleted on decision either
            way.
          </p>
        </Card>

        <Card>
          <h2 className="text-headline font-semibold mb-2">You never have to upload one</h2>
          <p className="text-body text-pretty">
            Verification is optional. A report without a receipt still counts
            toward the prices other owners see; it simply carries no verified
            badge.
          </p>
        </Card>
      </div>
    </div>
  );
}
