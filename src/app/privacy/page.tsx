
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Home } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Privacy Policy"
        description="Your privacy is important to us."
        icon={Shield}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Our Commitment to Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            At PokeAPI Admin, accessible from your application URL, one of our main priorities is the privacy of our
            visitors. This Privacy Policy document contains types of information that is collected and recorded by
            PokeAPI Admin and how we use it.
          </p>
          <p>
            If you have additional questions or require more information about our Privacy Policy, do not hesitate to
            contact us.
          </p>
          <h3 className="font-semibold text-lg mt-4">Information We Collect</h3>
          <p>
            The personal information that you are asked to provide, and the reasons why you are asked to provide it,
            will be made clear to you at the point we ask you to provide your personal information.
          </p>
          <p>
            If you contact us directly, we may receive additional information about you such as your name, email address,
            phone number, the contents of the message and/or attachments you may send us, and any other information
            you may choose to provide.
          </p>
          <p>
            When you register for an Account, we may ask for your contact information, including items such as name,
            company name, address, email address, and telephone number.
          </p>
          <h3 className="font-semibold text-lg mt-4">How We Use Your Information</h3>
          <p>We use the information we collect in various ways, including to:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Provide, operate, and maintain our application</li>
            <li>Improve, personalize, and expand our application</li>
            <li>Understand and analyze how you use our application</li>
            <li>Develop new products, services, features, and functionality</li>
            <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the application, and for marketing and promotional purposes</li>
            <li>Send you emails</li>
            <li>Find and prevent fraud</li>
          </ul>
          <h3 className="font-semibold text-lg mt-4">Log Files</h3>
          <p>
            PokeAPI Admin follows a standard procedure of using log files. These files log visitors when they
            visit applications. All hosting companies do this and a part of hosting services' analytics. The
            information collected by log files include internet protocol (IP) addresses, browser type, Internet
            Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks.
            These are not linked to any information that is personally identifiable. The purpose of the information
            is for analyzing trends, administering the site, tracking users' movement on the application, and
            gathering demographic information.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            This is a placeholder privacy policy. Please replace with your actual Privacy Policy.
            Last updated: {new Date().toLocaleDateString()}.
          </p>
        </CardContent>
      </Card>
      <div className="mt-8 text-center">
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
