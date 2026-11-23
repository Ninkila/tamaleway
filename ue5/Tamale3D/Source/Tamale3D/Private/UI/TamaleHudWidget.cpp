#include "UI/TamaleHudWidget.h"
#include "Components/ProgressBar.h"
#include "Components/TextBlock.h"
#include "Core/TamaleGameInstance.h"
#include "Core/TamaleTimeOfDaySubsystem.h"
#include "Interaction/TamaleInteractionComponent.h"
#include "Player/TamaleNeedsComponent.h"
#include "Player/TamalePlayerCharacter.h"

void UTamaleHudWidget::BindToPlayer(ATamalePlayerCharacter* PlayerChar)
{
    if (!PlayerChar) return;

    if (UTamaleNeedsComponent* NeedsComp = PlayerChar->NeedsComponent)
    {
        NeedsComp->OnNeedsUpdated.AddDynamic(this, &UTamaleHudWidget::HandleNeedsUpdated);
        HandleNeedsUpdated(NeedsComp->Needs, NeedsComp->HomeState);
    }

    if (UTamaleInteractionComponent* InteractComp = PlayerChar->InteractionComponent)
    {
        InteractComp->OnFocusChanged.AddDynamic(this, &UTamaleHudWidget::HandleFocusChanged);
        HandleFocusChanged(false, FText::GetEmpty(), FText::GetEmpty());
    }

    if (UWorld* World = GetWorld())
    {
        if (UTamaleTimeOfDaySubsystem* TimeSys = World->GetSubsystem<UTamaleTimeOfDaySubsystem>())
        {
            TimeSys->OnClockUpdated.AddDynamic(this, &UTamaleHudWidget::HandleClockUpdated);
            HandleClockUpdated(TimeSys->GetGameMinutes(), TimeSys->GetCurrentPeriod());
        }
    }

    if (UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance()))
    {
        const FTamaleCharacterSaveState State = GI->GetActiveCharacterState();
        if (TxtMoneySummary)
        {
            TxtMoneySummary->SetText(FText::FromString(FString::Printf(TEXT("Cash: GHC %d | MoMo: GHC %d"), State.MoneyCedis, State.MomoBalanceCedis)));
        }
    }
}

void UTamaleHudWidget::HandleNeedsUpdated(const FTamaleNeedsData& Needs, const FTamaleHomeStateData& HomeState)
{
    if (BarEnergy) BarEnergy->SetPercent(Needs.Energy / 100.0f);
    if (BarHygiene) BarHygiene->SetPercent(Needs.Hygiene / 100.0f);
    if (BarHunger) BarHunger->SetPercent(Needs.Hunger / 100.0f);
    if (BarThirst) BarThirst->SetPercent(Needs.Thirst / 100.0f);
    if (BarComfort) BarComfort->SetPercent(Needs.Comfort / 100.0f);
    if (BarHomeCleanliness) BarHomeCleanliness->SetPercent(HomeState.HomeCleanliness / 100.0f);
    if (TxtDistrictName) TxtDistrictName->SetText(FText::FromString(HomeState.HomeDistrict));
}

void UTamaleHudWidget::HandleFocusChanged(bool bHasTarget, FText PromptText, FText DagbaniSubtitle)
{
    if (PromptContainer)
    {
        PromptContainer->SetVisibility(bHasTarget ? ESlateVisibility::Visible : ESlateVisibility::Collapsed);
    }
    if (TxtInteractionPrompt)
    {
        TxtInteractionPrompt->SetText(PromptText);
    }
    if (TxtDagbaniPrompt)
    {
        TxtDagbaniPrompt->SetText(DagbaniSubtitle);
    }
}

void UTamaleHudWidget::HandleClockUpdated(float CurrentMinutes, ETamaleTimePeriod Period)
{
    if (!TxtClockAndDay) return;
    if (const UWorld* World = GetWorld())
    {
        if (const UTamaleTimeOfDaySubsystem* TimeSys = World->GetSubsystem<UTamaleTimeOfDaySubsystem>())
        {
            TxtClockAndDay->SetText(FText::FromString(FString::Printf(TEXT("Day %d - %s"), TimeSys->GetDayCount(), *TimeSys->GetFormattedClock())));
        }
    }
}
