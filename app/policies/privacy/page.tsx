import Link from "next/link";
import type { Metadata } from "next";
import { Card, PageTitle, SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy · GarageIntel",
  description: "What GarageIntel stores about you, why, and how to get rid of it.",
};

/*
  Written from the schema rather than from a template.

  Every item listed below is a column that actually exists, which is the only
  way this stays true: a policy that describes data the site does not hold, or
  omits data it does, is worse than none — it is a false statement about
  people's information.

  Not legal advice, and not a substitute for a solicitor reading it before the
  site takes money at scale.
*/
export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageTitle
        title="Privacy"
        subtitle="What we store, why we store it, and how to make us stop."
      />

      <SectionTitle>What we store</SectionTitle>
      <Card className="space-y-3">
        <ul className="text-subhead text-secondary space-y-2 list-disc pl-5 text-pretty">
          <li>
            <strong className="text-label">Your account.</strong> Email address,
            a hashed password (bcrypt — we never hold the password itself), your
            username and display name, and whether two-factor is switched on.
          </li>
          <li>
            <strong className="text-label">Your cars.</strong> Make, model,
            year, generation, trim, mileage, and any nickname. If you add a car
            by VIN we keep what the VIN decodes to, not the VIN itself.
          </li>
          <li>
            <strong className="text-label">Your reports.</strong> What you paid,
            where, on which car, when, the mileage, and your ratings. These are
            shown publicly, attributed to your display name.
          </li>
          <li>
            <strong className="text-label">A profile photo</strong>, if you
            upload one.
          </li>
          <li>
            <strong className="text-label">An audit record</strong> of security
            actions — signing in a second factor, a role change, a document
            being viewed — so a compromise can be traced.
          </li>
          <li>
            <strong className="text-label">One IP address, briefly.</strong> The
            address that asked for a password reset is kept with that reset
            token so abuse can be spotted. It goes when the token does.
          </li>
        </ul>
      </Card>

      <SectionTitle>What we deliberately do not store</SectionTitle>
      <Card className="space-y-3">
        <ul className="text-subhead text-secondary space-y-2 list-disc pl-5 text-pretty">
          <li>
            <strong className="text-label">Receipts.</strong> A receipt is
            checked and then destroyed. It is never kept after a decision. The{" "}
            <Link href="/policies/receipts" className="text-accent font-medium">
              receipt policy
            </Link>{" "}
            sets out exactly how.
          </li>
          <li>
            <strong className="text-label">Card details.</strong> Payments go to
            Stripe. We never see or hold a card number. All we keep is the
            customer and subscription reference Stripe gives us.
          </li>
          <li>
            <strong className="text-label">Your location history.</strong> When
            you search near you, the coordinates are used for that search and
            not written down against your account.
          </li>
          <li>
            <strong className="text-label">Tracking or advertising cookies.</strong>{" "}
            The only cookie is the one that keeps you signed in.
          </li>
        </ul>
      </Card>

      <SectionTitle>Who else sees it</SectionTitle>
      <Card className="space-y-3">
        <p className="text-subhead text-pretty">
          We do not sell your data and we do not share it for advertising. It
          reaches other companies only where they do a job the site needs:
        </p>
        <ul className="text-subhead text-secondary space-y-2 list-disc pl-5 text-pretty">
          <li><strong className="text-label">Stripe</strong> — payments and subscriptions.</li>
          <li><strong className="text-label">OpenStreetMap and Nominatim</strong> — map tiles and turning an address into a pin.</li>
          <li><strong className="text-label">Our hosting and database providers</strong> — running the site.</li>
          <li><strong className="text-label">An email provider</strong> — sending password reset links.</li>
        </ul>
        <p className="text-footnote text-secondary text-pretty">
          Your reports are public by design. That is the point of the site: other
          owners can see what work cost. Your email address is never shown.
        </p>
      </Card>

      <SectionTitle>Getting rid of it</SectionTitle>
      <Card className="space-y-3">
        <p className="text-subhead text-pretty">
          You can delete your account from settings at any time. That removes
          your profile, your cars, and your saved searches.
        </p>
        <p className="text-subhead text-secondary text-pretty">
          Your reports are withdrawn with it. They stop being shown to anyone,
          so the prices you contributed leave the site along with your account.
          We keep the rows rather than erasing them outright, so that a report
          removed by mistake can be restored and so a fraud investigation has
          something to look at; nobody browsing the site can see them.
        </p>
        <p className="text-subhead text-secondary text-pretty">
          You can also ask for a copy of what we hold about you, or ask us to
          correct it.
        </p>
      </Card>

      <Card className="mt-8">
        <p className="text-footnote text-secondary text-pretty">
          This describes what the site actually does today and will change as it
          changes. Nothing here is legal advice, and where local data-protection
          law gives you rights, it takes precedence over anything written on
          this page.
        </p>
      </Card>
    </div>
  );
}
