#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "TamaleGameMode.generated.h"

class UDataTable;
class ATamaleCityBootstrapActor;

/**
 * Wires the TAMALE 3D player controller/character/HUD, makes sure the city exists
 * (spawning the greybox builder when the level has none), and spawns the player at the
 * active character's saved position when the level has no PlayerStart.
 */
UCLASS()
class TAMALE3D_API ATamaleGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    ATamaleGameMode();

    /** Optional editor-imported tables (C++ systems read UTamaleDataRegistrySubsystem instead). */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Data")
    TObjectPtr<UDataTable> LandmarksTable;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Data")
    TObjectPtr<UDataTable> RoadsTable;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Data")
    TObjectPtr<UDataTable> DagbaniTermsTable;

    /** Spawn ATamaleCityBootstrapActor automatically when the level does not contain one. */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "World")
    bool bAutoSpawnGreyboxCity = true;

    virtual void RestartPlayer(AController* NewPlayer) override;
    virtual void StartPlay() override;

protected:
    virtual void BeginPlay() override;

private:
    void EnsureCityExists();
};
