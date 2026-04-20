import { Monitor, Smartphone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  getSavedExperience, 
  switchExperience, 
  clearSavedExperience,
  detectExperience,
  isExperienceLocked,
  getLockedExperience,
  ExperienceType 
} from "@/lib/experienceRouting";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * ExperienceSwitcher - Allows users to manually switch between
 * mobile and web experiences
 */
export function ExperienceSwitcher() {
  const userRoleQuery = useUserRole();
  const role = userRoleQuery.data?.role;
  const [currentExperience, setCurrentExperience] = useState<ExperienceType>('web');
  const [hasManualPreference, setHasManualPreference] = useState(false);
  
  const locked = isExperienceLocked(role);
  const lockedTo = getLockedExperience(role);

  useEffect(() => {
    const saved = getSavedExperience();
    setHasManualPreference(!!saved);
    setCurrentExperience(detectExperience({ role }));
  }, [role]);

  const handleSwitch = (type: ExperienceType) => {
    switchExperience(type);
  };

  const handleResetToDefault = () => {
    clearSavedExperience();
    const defaultExp = detectExperience({ role, forceDetection: true });
    switchExperience(defaultExp);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          View Mode
          {hasManualPreference && (
            <Badge variant="secondary" className="text-xs">
              Custom
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Choose your preferred interface. Mobile view is optimized for touch and smaller screens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {locked && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Your role requires the {lockedTo === 'mobile' ? 'Mobile' : 'Desktop'} view.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant={currentExperience === 'web' ? 'default' : 'outline'}
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => handleSwitch('web')}
            disabled={locked && lockedTo !== 'web'}
          >
            <Monitor className="h-6 w-6" />
            <span>Desktop View</span>
            <span className="text-xs text-muted-foreground font-normal">
              Full dashboard experience
            </span>
          </Button>

          <Button
            variant={currentExperience === 'mobile' ? 'default' : 'outline'}
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => handleSwitch('mobile')}
            disabled={locked && lockedTo !== 'mobile'}
          >
            <Smartphone className="h-6 w-6" />
            <span>Mobile View</span>
            <span className="text-xs text-muted-foreground font-normal">
              Touch-optimized interface
            </span>
          </Button>
        </div>

        {hasManualPreference && !locked && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-muted-foreground"
            onClick={handleResetToDefault}
          >
            Reset to automatic detection
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {locked 
            ? "View is determined by your role" 
            : "Your choice will be remembered across sessions"
          }
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for use in settings dropdowns or footers
 */
export function ExperienceSwitcherCompact() {
  const userRoleQuery = useUserRole();
  const role = userRoleQuery.data?.role;
  const [currentExperience, setCurrentExperience] = useState<ExperienceType>('web');

  const locked = isExperienceLocked(role);

  useEffect(() => {
    setCurrentExperience(detectExperience({ role }));
  }, [role]);

  const handleSwitch = () => {
    const newExperience = currentExperience === 'web' ? 'mobile' : 'web';
    switchExperience(newExperience);
  };

  // Don't show switcher if experience is locked
  if (locked) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      className="gap-2"
    >
      {currentExperience === 'web' ? (
        <>
          <Smartphone className="h-4 w-4" />
          Switch to Mobile View
        </>
      ) : (
        <>
          <Monitor className="h-4 w-4" />
          Switch to Desktop View
        </>
      )}
    </Button>
  );
}
