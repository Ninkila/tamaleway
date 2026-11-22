#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "TamaleInteractableInterface.generated.h"

UINTERFACE(MinimalAPI, BlueprintType)
class UTamaleInteractableInterface : public UInterface
{
    GENERATED_BODY()
};

/**
 * Reusable interaction contract implemented by home stations, doors,
 * NPCs, shops, beds, showers, and vehicles across Tamale.
 */
class TAMALE3D_API ITamaleInteractableInterface
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interaction")
    FText GetInteractionPrompt(AActor* Interactor) const;

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interaction")
    FText GetDagbaniSubtitle(AActor* Interactor) const;

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interaction")
    bool CanInteract(AActor* Interactor) const;

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interaction")
    void ExecuteInteraction(AActor* Interactor);
};
