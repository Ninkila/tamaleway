#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "Data/TamaleWorldTypes.h"
#include "TamaleHudWidget.generated.h"

class UTextBlock;
class UProgressBar;
class UWidget;
class ATamalePlayerCharacter;

/**
 * Clean, minimal Phase 1 HUD base widget. Exposes needs, clock/day, location,
 * money, and a contextual interaction prompt that hides automatically when idle.
 */
UCLASS(Abstract)
class TAMALE3D_API UTamaleHudWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "HUD")
    void BindToPlayer(ATamalePlayerCharacter* PlayerChar);

protected:
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UTextBlock> TxtDistrictName;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UTextBlock> TxtClockAndDay;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UTextBlock> TxtMoneySummary;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UProgressBar> BarEnergy;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UProgressBar> BarHygiene;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UProgressBar> BarHunger;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UProgressBar> BarThirst;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UProgressBar> BarComfort;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UProgressBar> BarHomeCleanliness;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UWidget> PromptContainer;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UTextBlock> TxtInteractionPrompt;
    UPROPERTY(meta = (BindWidgetOptional)) TObjectPtr<UTextBlock> TxtDagbaniPrompt;

    UFUNCTION()
    void HandleNeedsUpdated(const FTamaleNeedsData& Needs, const FTamaleHomeStateData& HomeState);

    UFUNCTION()
    void HandleFocusChanged(bool bHasTarget, FText PromptText, FText DagbaniSubtitle);

    UFUNCTION()
    void HandleClockUpdated(float CurrentMinutes, ETamaleTimePeriod Period);
};
