#include "Core/TamaleGameMode.h"
#include "Player/TamalePlayerCharacter.h"
#include "Player/TamalePlayerController.h"
#include "Tamale3D.h"

ATamaleGameMode::ATamaleGameMode()
{
    DefaultPawnClass = ATamalePlayerCharacter::StaticClass();
    PlayerControllerClass = ATamalePlayerController::StaticClass();
}

void ATamaleGameMode::BeginPlay()
{
    Super::BeginPlay();
    UE_LOG(LogTamale3D, Log, TEXT("TamaleGameMode started - Changli Phase 1 Milestone."));
}
