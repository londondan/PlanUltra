import Link from "next/link";
import { buttonVariants } from "@/lib/button-variants";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center gap-8">
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">
          Plan your ultra marathon,{" "}
          <span className="text-primary">mile by mile</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Upload a GPX file, set your pace, and get hour-by-hour weather
          forecasts aligned to your position on course. Turn a route into a
          complete race-day plan.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/auth/signin" className={cn(buttonVariants({ size: 'lg' }))}>
          Get started free
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 text-left max-w-3xl w-full">
        {[
          {
            title: "GPX Upload",
            description:
              "Upload any GPX file and instantly see your route on an interactive map with aid stations.",
          },
          {
            title: "Pace Planning",
            description:
              "Enter your target pace or finish time and see estimated arrival times at every aid station.",
          },
          {
            title: "Weather Aligned",
            description:
              "Get hourly forecasts matched to where you'll be on course — not just the start line.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border bg-card p-6 space-y-2"
          >
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
