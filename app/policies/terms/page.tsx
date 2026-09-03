import Link from "next/link";
import type { Metadata } from "next";
import { Card, PageTitle, SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Terms and ground rules",
  description:
    "What Gaari is, what it is not, and who is responsible for what people post.",
};

/*
  Plain-language ground rules. Deliberately not written as a wall of clauses:
  a policy nobody reads protects nobody, and the things that actually matter
  here are simple enough to say in ordinary sentences.

  This is not legal advice and is not a substitute for a solicitor reviewing
  it before the site takes real money at scale.
*/
export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageTitle
        title="Terms and ground rules"
        subtitle="The short version: this is owners reporting their own experiences, and we do not vouch for any of it."
      />

      <SectionTitle>What Gaari is</SectionTitle>
      <Card className="space-y-3">
        <p className="text-subhead text-pretty">
          Gaari collects what car owners say they paid, at which shop, on which
          car. It exists so you can see what people with a car like yours were
          charged nearby, and how the work went.
        </p>
        <p className="text-subhead text-secondary text-pretty">
          Everything you read here was written by another owner. It is their
          account of their experience, not ours, and not a recommendation.
        </p>
      </Card>

      <SectionTitle>What we are not responsible for</SectionTitle>
      <Card className="space-y-3">
        <p className="text-subhead text-pretty">
          We do not write the reports, we do not carry out the work, and we are
          not a party to anything you agree with a shop. In particular:
        </p>
        <ul className="text-subhead text-secondary space-y-2 list-disc pl-5 text-pretty">
          <li>
            <strong className="text-label">Accuracy.</strong> People make
            mistakes, misremember prices, and occasionally lie. A price here is
            what somebody said they paid, not a quote and not a guarantee.
          </li>
          <li>
            <strong className="text-label">The work itself.</strong> Choosing a
            shop is your decision. We do not vet, license, insure, or stand
            behind any business listed.
          </li>
          <li>
            <strong className="text-label">Listings.</strong> Some shops are
            imported from public map data and some are added by users. A listing
            is not evidence that a business exists, is trading, or is any good.
            Listings we have not confirmed are labelled unconfirmed.
          </li>
          <li>
            <strong className="text-label">Outcomes.</strong> If work goes
            badly, that is between you and the shop. Nothing here creates a
            warranty from us.
          </li>
        </ul>
      </Card>

      <SectionTitle>Rules for posting</SectionTitle>
      <Card className="space-y-3">
        <ul className="text-subhead text-secondary space-y-2 list-disc pl-5 text-pretty">
          <li>
            <strong className="text-label">Report only what happened to you.</strong>{" "}
            First-hand experiences, on a car you own or owned. Not hearsay, not
            someone else&rsquo;s story.
          </li>
          <li>
            <strong className="text-label">Real prices.</strong> Post what you
            actually paid, including whether it was parts, labour, or both.
          </li>
          <li>
            <strong className="text-label">
              No made-up reports, either direction.
            </strong>{" "}
            Do not post about your own shop, pay anyone to post, or post to
            damage a competitor. This is the fastest way to lose an account.
          </li>
          <li>
            <strong className="text-label">No personal attacks.</strong> Say the
            work was poor. Do not post accusations about named individuals, and
            do not post anyone&rsquo;s personal details.
          </li>
          <li>
            <strong className="text-label">Nothing unlawful.</strong> No
            harassment, no discriminatory abuse, nothing that infringes someone
            else&rsquo;s rights.
          </li>
        </ul>
        <p className="text-footnote text-secondary text-pretty">
          You keep ownership of what you write. By posting it you give us
          permission to display it on the site.
        </p>
      </Card>

      <SectionTitle>When something is wrong</SectionTitle>
      <Card className="space-y-3">
        <p className="text-subhead text-pretty">
          Every report can be flagged. Flagged content is looked at by a person,
          and we remove anything that breaks the rules above. Shops can claim
          their listing and reply publicly to reports about them.
        </p>
        <p className="text-subhead text-secondary text-pretty">
          We can remove content or close an account that breaks these rules.
          Removing a report is not a judgement about the shop.
        </p>
      </Card>

      <SectionTitle>Your account and your data</SectionTitle>
      <Card className="space-y-3">
        <p className="text-subhead text-pretty">
          Receipts uploaded as proof are checked and then destroyed &mdash; they
          are never kept. That is set out in full in the{" "}
          <Link href="/policies/receipts" className="text-accent font-medium">
            receipt policy
          </Link>
          .
        </p>
        <p className="text-subhead text-secondary text-pretty">
          You can delete your account at any time from settings. Payments are
          handled by Stripe; we never see or store card details.
        </p>
      </Card>

      {/*
        Written from what the code actually does, not from a template. The
        distinction that matters on a site like this one is the last
        paragraph: automation reads and screens, it never writes a price.
      */}
      <SectionTitle>How this site is built, and what is automated</SectionTitle>
      <Card className="space-y-3">
        <p className="text-subhead text-pretty">
          The software behind Gaari was written with substantial help from AI
          coding tools. We are saying so plainly because you are trusting the
          site with money questions, and you should know how it was made.
        </p>
        <p className="text-subhead text-secondary text-pretty">
          Most shop listings were bulk-imported from open map data rather than
          entered by hand, so a listing existing here is not a sign anyone has
          checked it. Some will be closed, misfiled or duplicated. Tell us and
          we will fix it.
        </p>
        <p className="text-subhead text-secondary text-pretty">
          Two things happen automatically rather than by a person. Receipts
          uploaded as proof are read by text recognition and compared against
          the shop name and total you entered, and posted text is screened for
          abuse before it appears. Both can get it wrong in either direction,
          and you can ask a person to look again.
        </p>
        <p className="text-subhead text-pretty">
          What is never automated is the substance. Every price, rating and
          written report on this site came from a person who says they paid
          it. Nothing here is generated, inferred, estimated or filled in to
          make the site look busier than it is.
        </p>
      </Card>

      <Card className="mt-8">
        <p className="text-footnote text-secondary text-pretty">
          These rules may change as the site grows. Nothing here is legal
          advice, and where local consumer law gives you rights, it takes
          precedence over anything written on this page.
        </p>
      </Card>
    </div>
  );
}
