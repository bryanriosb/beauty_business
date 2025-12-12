'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTutorial } from '@/hooks/use-tutorial'
import { TUTORIALS } from '@/const/tutorials'

interface TutorialDropdownProps {
  className?: string
}

export function TutorialDropdown({ className }: TutorialDropdownProps) {
  const {
    startTutorial,
    restartTutorial,
    isTutorialCompleted,
    getAvailableTutorials,
    isLoading,
  } = useTutorial()

  const [isOpen, setIsOpen] = useState(false)

  const handleStartTutorial = (tutorialId: string) => {
    const wasCompleted = isTutorialCompleted(tutorialId)
    if (wasCompleted) {
      restartTutorial(tutorialId)
    } else {
      startTutorial(tutorialId)
    }
    setIsOpen(false)
  }

  if (isLoading) {
    return null
  }

  const availableTutorials = getAvailableTutorials()
  const allTutorials = Object.values(TUTORIALS)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          title="Tutoriales disponibles"
        >
          <HelpCircle className="!h-5 !w-5" />
          <span className="sr-only">Tutoriales</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-sm font-medium text-gray-700 border-b">
          Tutoriales Disponibles
        </div>

        {availableTutorials.length > 0 ? (
          <>
            {availableTutorials.map((tutorial) => (
              <DropdownMenuItem
                key={tutorial.id}
                onClick={() => handleStartTutorial(tutorial.id)}
                className="cursor-pointer"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{tutorial.name}</span>
                  <span className="text-xs text-gray-500">
                    {tutorial.description}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}

            {availableTutorials.length < allTutorials.length && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500 border-t">
                  Tutoriales completados:
                </div>
                {allTutorials
                  .filter((t) => isTutorialCompleted(t.id))
                  .map((tutorial) => (
                    <DropdownMenuItem
                      key={tutorial.id}
                      onClick={() => handleStartTutorial(tutorial.id)}
                      className="cursor-pointer opacity-70"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-gray-600">
                          {tutorial.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          Click para repetir
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
              </>
            )}
          </>
        ) : (
          <div className="px-2 py-4 text-sm text-gray-500 text-center">
            ¡Has completado todos los tutoriales disponibles!
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
