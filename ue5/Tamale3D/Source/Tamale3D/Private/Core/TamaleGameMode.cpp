#include "Core/TamaleGameMode.h"
#include "Core/TamaleGameInstance.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerStart.h"
#include "Player/TamalePlayerCharacter.h"
#include "Player/TamalePlayerController.h"
#include "Tamale3D.h"
#include "UI/TamaleHUD.h"
#include "World/TamaleCityBootstrapActor.h"

ATamaleGameMode::ATamaleGameMode()
{
    DefaultPawnClass = ATamalePlayerCharacter::StaticClass();
    PlayerControllerClass = ATamalePlayerController::StaticClass();
    HUDClass = ATamaleHUD::StaticClass();
}

void ATamaleGameMode::EnsureCityExists()
{
    UWorld* World = GetWorld();
    if (!World)
    {
        return;
    }

    ATamaleCityBootstrapActor* City = nullptr;
    for (TActorIterator<ATamaleCityBootstrapActor> It(World); It; ++It)
    {
        City = *It;
        break;
    }
    if (!City && bAutoSpawnGreyboxCity)
    {
        FActorSpawnParameters Params;
        Params.Name = TEXT("TamaleGreyboxCity");
        Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
        City = World->SpawnActor<ATamaleCityBootstrapActor>(FVector::ZeroVector, FRotator::ZeroRotator, Params);
    }
    // Build now (not at BeginPlay) so the ground exists before the first pawn is placed.
    if (City && City->bAutoBuild)
    {
        City->BuildGreyboxCity();
    }
}

void ATamaleGameMode::RestartPlayer(AController* NewPlayer)
{
    EnsureCityExists();

    UWorld* World = GetWorld();
    const bool bLevelHasPlayerStart = World && TActorIterator<APlayerStart>(World);
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());

    if (!bLevelHasPlayerStart && GI && NewPlayer)
    {
        // Spawn where the active character was last saved (seeded from DT_PlayableCharacters).
        const FTamaleCharacterSaveState State = GI->GetActiveCharacterState();
        const FVector Location = State.SavedWorldLocation + FVector(0.0, 0.0, 20.0);
        const FRotator Rotation(0.0f, State.SavedWorldRotation.Yaw, 0.0f);
        UE_LOG(LogTamale3D, Log, TEXT("No PlayerStart in level - spawning %s at %s"), *State.DisplayName, *Location.ToCompactString());
        RestartPlayerAtTransform(NewPlayer, FTransform(Rotation, Location));
        return;
    }

    Super::RestartPlayer(NewPlayer);
}

void ATamaleGameMode::StartPlay()
{
    EnsureCityExists();
    Super::StartPlay();
}

void ATamaleGameMode::BeginPlay()
{
    Super::BeginPlay();
    UE_LOG(LogTamale3D, Log, TEXT("TamaleGameMode started - Batch 1/2 greybox milestone."));
}
