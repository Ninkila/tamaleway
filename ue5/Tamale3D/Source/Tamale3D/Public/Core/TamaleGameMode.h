#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "TamaleGameMode.generated.h"

/**
 * Coordinates Phase 1 Tamale simulation spawn, DataTable references,
 * and default PlayerController/Character wiring.
 */
UCLASS()
class TAMALE3D_API ATamaleGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    ATamaleGameMode();

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Data")
    TObjectPtr<UDataTable> LandmarksTable;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Data")
    TObjectPtr<UDataTable> RoadsTable;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Data")
    TObjectPtr<UDataTable> DagbaniTermsTable;

protected:
    virtual void BeginPlay() override;
};
