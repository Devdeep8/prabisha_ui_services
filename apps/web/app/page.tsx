"use client"
import { Button } from "@workspace/ui/components/button"
import {Label} from "@workspace/ui/components/label"

export default function Page() {
  const handleClick = () => {
    console.log("Button clicked!")
  }
  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="flex flex-col items-center justify-center gap-4">
        <Label className="cursor-pointer text-3xl " >Deva UI</Label>
        <h1 className=" text-2xl text-center">
          Welocome to Deva UI
        </h1>
        <Button onClick={handleClick} className="cursor-pointer" size="sm">Button</Button>
      </div>
    </div>
  )
}
