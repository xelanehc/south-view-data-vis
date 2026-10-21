import { InfoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <InfoIcon />
          About
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>About this project</DialogTitle>
          <DialogDescription>
            An interactive look at South-View Cemetery, founded in 1886 in Atlanta, Georgia and
            the oldest African American-owned cemetery in the United States.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium">Map</h3>
            <p className="text-muted-foreground">
              Move the timeline to watch the cemetery grow section by section, with population,
              demographics and notable figures for each period.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Network</h3>
            <p className="text-muted-foreground">
              Explore how the people buried here were connected, either through family and
              friendship or through the historical events they took part in.
            </p>
          </div>
          <p className="rounded-md border bg-muted/50 p-3 text-muted-foreground">
            The names, biographies and statistics shown are sample data for demonstration. The
            structure is ready to be filled in with real archival records.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
