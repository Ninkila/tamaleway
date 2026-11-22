#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Data/TamaleWorldTypes.h"
#include "TamaleNeedsComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FOnTamaleNeedsUpdated,
    const FTamaleNeedsData&, Needs,
    const FTamaleHomeStateData&, HomeState
);

/**
 * Manages player daily-life needs (Energy, Hygiene, Hunger, Thirst, Comfort, Social)
 * and personal Changli home state (cleanliness, laundry, dishes, sleep recovery).
 */
UCLASS(ClassGroup=(Tamale), meta=(BlueprintSpawnableComponent))
class TAMALE3D_API UTamaleNeedsComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UTamaleNeedsComponent();

    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DailyLife")
    FTamaleNeedsData Needs;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DailyLife")
    FTamaleHomeStateData HomeState;

    UPROPERTY(BlueprintAssignable, Category = "DailyLife")
    FOnTamaleNeedsUpdated OnNeedsUpdated;

    UFUNCTION(BlueprintCallable, Category = "DailyLife")
    void LoadFromSaveState(const FTamaleNeedsData& InNeeds, const FTamaleHomeStateData& InHome);

    UFUNCTION(BlueprintCallable, Category = "DailyLife")
    void ApplySleepRecovery(bool bIsNap);

    UFUNCTION(BlueprintCallable, Category = "DailyLife")
    void ApplyHygieneShower();

    UFUNCTION(BlueprintCallable, Category = "DailyLife")
    void ApplyHygieneWashbasin();

    UFUNCTION(BlueprintCallable, Category = "DailyLife")
    void ApplyMealOrDrink(float HungerGain, float ThirstGain, float EnergyGain, float ComfortGain, bool bAddDirtyDish);

    UFUNCTION(BlueprintCallable, Category = "DailyLife")
    void ApplyCleanHome(bool bWashDishesOnly);

    UFUNCTION(BlueprintCallable, Category = "DailyLife")
    void ApplyLaundryCycle(bool bWashAndHang, bool bCollectDryClothes);

private:
    float DecayTimer = 0.0f;
    void ClampAllNeeds();
};
